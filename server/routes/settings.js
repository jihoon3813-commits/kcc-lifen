import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import { config } from '../config.js';
import { db, DEFAULT_RENTAL_FIELDS_CONFIG, DEFAULT_RENTAL_PRIVACY_CONTENT } from '../db/index.js';
import { requireAuth, requireRole, requireMenu } from '../middleware/auth.js';
import { seedDatabase } from '../db/seed.js';
import { deleteEncryptedObject, decryptText, readEncryptedObject } from '../utils/rentalSecurity.js';

const router = express.Router();

const formsUploadDir = path.join(config.uploadsDir, 'forms');
if (!fs.existsSync(formsUploadDir)) {
  fs.mkdirSync(formsUploadDir, { recursive: true });
}

const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, formsUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    const safeName = `form_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, safeName);
  }
});

const pdfUpload = multer({
  storage: pdfStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('PDF 파일만 업로드할 수 있습니다.'));
    }
  }
});

// 1. Get Labels
router.get('/labels', requireAuth, (req, res) => {
  const labels = db.prepare('SELECT name, color FROM system_labels ORDER BY id ASC').all();
  res.json({ labels });
});

// Add Label
router.post('/labels', requireAuth, requireMenu('settings'), (req, res) => {
  const { name, color = '#7194dd' } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: '라벨명을 입력해 주세요.' });

  try {
    db.prepare('INSERT INTO system_labels (name, color) VALUES (?, ?)').run(name.trim(), color);
    res.status(201).json({ message: '라벨이 추가되었습니다.' });
  } catch {
    res.status(400).json({ error: '이미 존재하는 라벨명입니다.' });
  }
});

// 2. Get Stages
router.get('/stages', requireAuth, (req, res) => {
  const stages = db.prepare('SELECT name FROM system_stages WHERE is_active = 1 ORDER BY sort_order ASC').all();
  res.json({ stages: stages.map(s => s.name) });
});

// 2b. Contract & Payment Statuses CRUD
const ALLOWED_BADGE_COLORS = ['blue', 'orange', 'green', 'purple', 'red', 'gray', 'dark'];

router.get('/contract-statuses', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT id, name, color, sort_order
    FROM system_contract_statuses
    WHERE is_active = 1
    ORDER BY sort_order ASC, id ASC
  `).all();
  res.json({ contractStatuses: rows });
});

router.post('/contract-statuses', requireAuth, requireMenu('settings'), (req, res) => {
  const name = String(req.body?.name || '').trim();
  const rawColor = String(req.body?.color || 'blue').trim();
  const color = ALLOWED_BADGE_COLORS.includes(rawColor) ? rawColor : 'blue';

  if (!name) {
    return res.status(400).json({ error: '계약·수납 상태명을 입력해 주세요.' });
  }

  const dup = db.prepare('SELECT id, is_active FROM system_contract_statuses WHERE name = ?').get(name);
  if (dup) {
    if (!dup.is_active) {
      db.prepare('UPDATE system_contract_statuses SET is_active = 1, color = ? WHERE id = ?').run(color, dup.id);
      const revived = db.prepare('SELECT id, name, color, sort_order FROM system_contract_statuses WHERE id = ?').get(dup.id);
      return res.status(201).json({ statusItem: revived, message: '계약·수납 상태가 복원되었습니다.' });
    }
    return res.status(400).json({ error: '이미 존재하는 상태명입니다.' });
  }

  const maxRow = db.prepare('SELECT MAX(sort_order) as max_sort FROM system_contract_statuses').get();
  const nextSort = (maxRow?.max_sort || 0) + 1;

  const result = db.prepare(`
    INSERT INTO system_contract_statuses (name, color, sort_order, is_active)
    VALUES (?, ?, ?, 1)
  `).run(name, color, nextSort);

  const created = db.prepare('SELECT id, name, color, sort_order FROM system_contract_statuses WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ statusItem: created, message: '계약·수납 상태가 추가되었습니다.' });
});

router.patch('/contract-statuses/:id', requireAuth, requireMenu('settings'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const current = db.prepare('SELECT * FROM system_contract_statuses WHERE id = ? AND is_active = 1').get(id);
  if (!current) {
    return res.status(404).json({ error: '수정할 계약·수납 상태를 찾을 수 없습니다.' });
  }

  const { direction } = req.body || {};
  if (direction === 'up' || direction === 'down') {
    const all = db.prepare('SELECT id, sort_order FROM system_contract_statuses WHERE is_active = 1 ORDER BY sort_order ASC, id ASC').all();
    const idx = all.findIndex(r => r.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx !== -1 && swapIdx >= 0 && swapIdx < all.length) {
      const tx = db.transaction(() => {
        all.forEach((r, i) => {
          db.prepare('UPDATE system_contract_statuses SET sort_order = ? WHERE id = ?').run(i + 1, r.id);
        });
        db.prepare('UPDATE system_contract_statuses SET sort_order = ? WHERE id = ?').run(swapIdx + 1, all[idx].id);
        db.prepare('UPDATE system_contract_statuses SET sort_order = ? WHERE id = ?').run(idx + 1, all[swapIdx].id);
      });
      tx();
    }
    const rows = db.prepare('SELECT id, name, color, sort_order FROM system_contract_statuses WHERE is_active = 1 ORDER BY sort_order ASC, id ASC').all();
    return res.json({ contractStatuses: rows, message: '순서가 변경되었습니다.' });
  }

  const nextName = req.body?.name !== undefined ? String(req.body.name).trim() : current.name;
  const rawColor = req.body?.color !== undefined ? String(req.body.color).trim() : current.color;
  const nextColor = ALLOWED_BADGE_COLORS.includes(rawColor) ? rawColor : current.color;

  if (!nextName) {
    return res.status(400).json({ error: '계약·수납 상태명을 입력해 주세요.' });
  }

  if (nextName !== current.name) {
    const dup = db.prepare('SELECT id FROM system_contract_statuses WHERE name = ? AND id != ?').get(nextName, id);
    if (dup) {
      return res.status(400).json({ error: '이미 존재하는 상태명입니다.' });
    }
  }

  const updateTx = db.transaction(() => {
    db.prepare('UPDATE system_contract_statuses SET name = ?, color = ? WHERE id = ?').run(nextName, nextColor, id);
    if (nextName !== current.name) {
      db.prepare('UPDATE contracts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE status = ?').run(nextName, current.name);
    }
  });
  updateTx();

  const updated = db.prepare('SELECT id, name, color, sort_order FROM system_contract_statuses WHERE id = ?').get(id);
  res.json({ statusItem: updated, previousName: current.name, message: '계약·수납 상태가 수정되었습니다.' });
});

router.delete('/contract-statuses/:id', requireAuth, requireMenu('settings'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const current = db.prepare('SELECT * FROM system_contract_statuses WHERE id = ? AND is_active = 1').get(id);
  if (!current) {
    return res.status(404).json({ error: '삭제할 계약·수납 상태를 찾을 수 없습니다.' });
  }

  const activeCount = db.prepare('SELECT COUNT(*) as cnt FROM system_contract_statuses WHERE is_active = 1').get()?.cnt || 0;
  if (activeCount <= 1) {
    return res.status(400).json({ error: '최소 1개 이상의 계약·수납 상태가 유지되어야 합니다.' });
  }

  db.prepare('DELETE FROM system_contract_statuses WHERE id = ?').run(id);
  res.json({ success: true, deletedName: current.name, message: '계약·수납 상태가 삭제되었습니다.' });
});

const STANDARD_RENTAL_FIELD_LABELS = {
  date: '날짜',
  name: '성명',
  signature: '서명',
  birthDate: '생년월일',
  phone: '연락처'
};

function sanitizeFieldsConfig(cfg) {
  if (!cfg) return DEFAULT_RENTAL_FIELDS_CONFIG;

  // 다중 페이지 필드 인스턴스 배열 지원
  if (Array.isArray(cfg)) {
    const list = cfg.map((it, idx) => {
      const key = ['date', 'name', 'signature', 'birthDate', 'phone'].includes(it.key) ? it.key : 'name';
      const label = STANDARD_RENTAL_FIELD_LABELS[key] || '성명';
      const id = it.id || `f_${key}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
      const page = Math.max(1, parseInt(it.page, 10) || 1);
      return {
        id,
        key,
        label,
        page,
        x: typeof it.x === 'number' ? Math.max(0, Math.min(100, it.x)) : 50,
        y: typeof it.y === 'number' ? Math.max(0, Math.min(100, it.y)) : 80,
        w: typeof it.w === 'number' ? Math.max(2, Math.min(100, it.w)) : (key === 'signature' ? 16 : 20),
        h: typeof it.h === 'number' ? Math.max(1, Math.min(100, it.h)) : (key === 'signature' ? 6.8 : 3.6),
        fontSize: parseInt(it.fontSize, 10) || (key === 'name' ? 15 : 14),
        fontWeight: it.fontWeight || (key === 'name' ? 'bold' : 'normal'),
        color: it.color || '#1a202c',
        align: it.align || 'center',
        format: (key === 'date' && (!it.format || it.format.includes('?')))
          ? 'YYYY년 MM월 DD일'
          : (it.format || (key === 'birthDate' ? 'YYYY-MM-DD' : undefined)),
        enabled: it.enabled !== false
      };
    });
    return list;
  }

  // 레거시 단일 맵 객체
  if (typeof cfg === 'object') {
    const result = {};
    for (const [key, label] of Object.entries(STANDARD_RENTAL_FIELD_LABELS)) {
      const item = cfg[key] || DEFAULT_RENTAL_FIELDS_CONFIG[key] || {};
      result[key] = {
        ...item,
        key,
        label, // 항상 올바른 한글 명칭 강제 보장
        page: parseInt(item.page, 10) || 1,
        format: (key === 'date' && (!item.format || item.format.includes('?')))
          ? 'YYYY년 MM월 DD일'
          : (item.format || (key === 'birthDate' ? 'YYYY-MM-DD' : undefined))
      };
    }
    return result;
  }

  return DEFAULT_RENTAL_FIELDS_CONFIG;
}

// 3. Get Consent Forms
// 사용자 요청: '(렌탈) 개인정보 동의서'만 유지하고 나머지 양식은 삭제
router.get('/forms', requireAuth, (req, res) => {
  // 비-렌탈 불필요 양식 자동 정리
  try {
    db.prepare("DELETE FROM consent_forms WHERE id NOT IN ('rental_privacy', 'rental_collection')").run();
  } catch {}

  // rental_privacy 기본 보장
  let mainForm = db.prepare("SELECT * FROM consent_forms WHERE id = 'rental_privacy'").get();
  if (!mainForm) {
    db.prepare(`
      INSERT INTO consent_forms (id, title, version, content, fields_config)
      VALUES (?, ?, 1, ?, ?)
    `).run(
      'rental_privacy',
      '(렌탈) 개인정보 동의서',
      DEFAULT_RENTAL_PRIVACY_CONTENT,
      JSON.stringify(DEFAULT_RENTAL_FIELDS_CONFIG)
    );
    mainForm = db.prepare("SELECT * FROM consent_forms WHERE id = 'rental_privacy'").get();
  }

  // 관리자 양식관리 목록에는 메인 (렌탈) 개인정보 동의서 (및 사용자 신규 추가 양식) 표시
  const forms = db.prepare("SELECT * FROM consent_forms WHERE id != 'rental_collection' ORDER BY id ASC").all();

  res.json({
    forms: forms.map(f => {
      let parsedFields = null;
      if (f.fields_config) {
        try { parsedFields = JSON.parse(f.fields_config); } catch {}
      }
      return {
        id: f.id,
        name: f.title,
        version: f.version,
        text: f.content,
        pdfPath: f.pdf_path || null,
        fileName: f.file_name || null,
        fieldsConfig: sanitizeFieldsConfig(parsedFields)
      };
    })
  });
});

function decodeKoreanFileName(rawName) {
  if (!rawName) return 'form.pdf';
  try {
    const decoded = Buffer.from(rawName, 'latin1').toString('utf8');
    if (decoded && !decoded.includes('\ufffd')) {
      return decoded;
    }
  } catch {}
  return rawName;
}

// PDF 파일 업로드 엔드포인트 (한글 파일명 깨짐 방지 디코딩 적용)
router.post('/forms/upload-pdf', requireAuth, requireMenu('settings'), (req, res) => {
  pdfUpload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'PDF 업로드에 실패했습니다.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: '업로드할 PDF 파일을 선택해 주세요.' });
    }
    const pdfUrl = `/uploads/forms/${req.file.filename}`;
    const clientFileName = req.body?.fileName ? String(req.body.fileName).trim() : '';
    const safeOriginalName = clientFileName || decodeKoreanFileName(req.file.originalname);

    res.json({
      success: true,
      pdfPath: pdfUrl,
      fileName: safeOriginalName,
      size: req.file.size
    });
  });
});

// 렌탈 신청 고객 정보 및 서명 목록 조회 (미리보기 연동용)
router.get('/forms/rental-applicants', requireAuth, (req, res) => {
  try {
    const apps = db.prepare(`
      SELECT ra.id, ra.customer_name, ra.customer_phone, ra.created_at, ra.status_code, ra.plan_title,
             rp.masked_birth_date, rp.encrypted_birth_date, rp.encrypted_phone,
             rdv.private_object_key, rdv.mime_type
      FROM rental_applications ra
      LEFT JOIN rental_applicant_private rp ON ra.id = rp.application_id
      LEFT JOIN rental_document_versions rdv ON ra.id = rdv.application_id AND rdv.kind = 'signature' AND rdv.deleted_at IS NULL
      ORDER BY ra.created_at DESC
      LIMIT 20
    `).all();

    const results = apps.map(app => {
      let plainBirth = '';
      if (app.encrypted_birth_date) {
        try { plainBirth = decryptText(app.encrypted_birth_date); } catch { plainBirth = app.masked_birth_date || ''; }
      } else {
        plainBirth = app.masked_birth_date || '1985-03-15';
      }

      let plainPhone = app.customer_phone;
      if (app.encrypted_phone) {
        try { plainPhone = decryptText(app.encrypted_phone); } catch {}
      }

      let signatureDataUrl = null;
      if (app.private_object_key) {
        try {
          const buf = readEncryptedObject(app.private_object_key);
          if (buf && buf.length > 0) {
            signatureDataUrl = `data:${app.mime_type || 'image/png'};base64,${buf.toString('base64')}`;
          }
        } catch (err) {}
      }

      let dateStr = '';
      if (app.created_at) {
        const d = new Date(app.created_at);
        if (!isNaN(d.getTime())) {
          dateStr = `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`;
        }
      }
      if (!dateStr) {
        const now = new Date();
        dateStr = `${now.getFullYear()}년 ${String(now.getMonth() + 1).padStart(2, '0')}월 ${String(now.getDate()).padStart(2, '0')}일`;
      }

      return {
        id: app.id,
        customerName: app.customer_name || '한지우',
        phone: plainPhone || '010-0000-1006',
        birthDate: plainBirth || '1985-03-15',
        date: dateStr,
        signatureDataUrl,
        planTitle: app.plan_title || '초기 부담을 줄이는 렌탈 (60개월)',
        status: app.status_code
      };
    });

    // 신청 데이터가 없을 경우를 대비한 기본 샘플 고객
    if (results.length === 0) {
      const now = new Date();
      results.push({
        id: 'SAMPLE-001',
        customerName: '한지우',
        phone: '010-8888-9999',
        birthDate: '1988-06-25',
        date: `${now.getFullYear()}년 ${String(now.getMonth() + 1).padStart(2, '0')}월 ${String(now.getDate()).padStart(2, '0')}일`,
        signatureDataUrl: null,
        planTitle: '60개월 렌탈 (스마트 플랜)',
        status: 'received'
      });
    }

    res.json({ applicants: results });
  } catch (err) {
    console.error('Failed to get rental applicants for form preview:', err);
    res.status(500).json({ error: '신청 고객 목록을 불러오지 못했습니다.' });
  }
});

// Update Consent Form (Saves previous version to history, updates fieldsConfig, pdfPath)
router.patch('/forms/:id', requireAuth, requireMenu('settings'), (req, res) => {
  const { id } = req.params;
  const { text, name, fieldsConfig, pdfPath, fileName } = req.body;

  const current = db.prepare('SELECT * FROM consent_forms WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: '양식을 찾을 수 없습니다.' });

  // Record history
  try {
    db.prepare(`
      INSERT INTO consent_history (form_id, version, content, updated_by)
      VALUES (?, ?, ?, ?)
    `).run(id, current.version, current.content, req.user.name);
  } catch {}

  // Update to new version
  const newVer = current.version + 1;
  const nextTitle = name !== undefined && String(name).trim() ? String(name).trim() : current.title;
  const nextContent = text !== undefined && String(text).trim() ? String(text).trim() : current.content;
  const nextPdfPath = pdfPath !== undefined ? pdfPath : current.pdf_path;
  const nextFileName = fileName !== undefined ? fileName : current.file_name;

  let sanitizedConfig = null;
  if (fieldsConfig !== undefined) {
    let parsed = fieldsConfig;
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch {}
    }
    sanitizedConfig = sanitizeFieldsConfig(parsed);
  } else if (current.fields_config) {
    try { sanitizedConfig = sanitizeFieldsConfig(JSON.parse(current.fields_config)); } catch {}
  } else {
    sanitizedConfig = DEFAULT_RENTAL_FIELDS_CONFIG;
  }

  const nextFields = JSON.stringify(sanitizedConfig);

  db.prepare(`
    UPDATE consent_forms
    SET title = ?, version = ?, content = ?, pdf_path = ?, file_name = ?, fields_config = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(nextTitle, newVer, nextContent, nextPdfPath, nextFileName, nextFields, id);

  res.json({
    success: true,
    version: newVer,
    message: '새 양식 버전 및 필드 설정이 저장되었습니다.',
    form: {
      id,
      name: nextTitle,
      version: newVer,
      text: nextContent,
      pdfPath: nextPdfPath,
      fileName: nextFileName,
      fieldsConfig: sanitizedConfig
    }
  });
});

// Create Consent Form
router.post('/forms', requireAuth, requireMenu('settings'), (req, res) => {
  const { name, text, pdfPath, fileName, fieldsConfig } = req.body;
  const title = (name || '').trim();
  const content = (text || '').trim() || DEFAULT_RENTAL_PRIVACY_CONTENT;

  if (!title) return res.status(400).json({ error: '양식 명칭을 입력해 주세요.' });

  const id = 'form_' + Date.now();
  const fieldsJson = fieldsConfig ? (typeof fieldsConfig === 'object' ? JSON.stringify(fieldsConfig) : String(fieldsConfig)) : JSON.stringify(DEFAULT_RENTAL_FIELDS_CONFIG);

  db.prepare(`
    INSERT INTO consent_forms (id, title, version, content, pdf_path, file_name, fields_config)
    VALUES (?, ?, 1, ?, ?, ?, ?)
  `).run(id, title, content, pdfPath || null, fileName || null, fieldsJson);

  const updatedForms = db.prepare("SELECT * FROM consent_forms WHERE id != 'rental_collection' ORDER BY id ASC").all();
  res.json({
    success: true,
    message: `'${title}' 양식이 추가되었습니다.`,
    forms: updatedForms.map(f => {
      let parsedFields = null;
      if (f.fields_config) {
        try { parsedFields = JSON.parse(f.fields_config); } catch {}
      }
      return {
        id: f.id,
        name: f.title,
        version: f.version,
        text: f.content,
        pdfPath: f.pdf_path || null,
        fileName: f.file_name || null,
        fieldsConfig: parsedFields || DEFAULT_RENTAL_FIELDS_CONFIG
      };
    })
  });
});

// Delete Consent Form
router.delete('/forms/:id', requireAuth, requireMenu('settings'), (req, res) => {
  const { id } = req.params;

  const current = db.prepare('SELECT * FROM consent_forms WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: '삭제할 양식을 찾을 수 없습니다.' });

  const total = db.prepare("SELECT COUNT(*) as count FROM consent_forms WHERE id != 'rental_collection'").get().count;
  if (total <= 1) {
    return res.status(400).json({ error: '최소 1개 이상의 양식 및 동의서는 유지되어야 합니다.' });
  }

  const delTx = db.transaction(() => {
    db.prepare('DELETE FROM consent_history WHERE form_id = ?').run(id);
    db.prepare('DELETE FROM consent_forms WHERE id = ?').run(id);
  });
  delTx();

  const updatedForms = db.prepare("SELECT * FROM consent_forms WHERE id != 'rental_collection' ORDER BY id ASC").all();
  res.json({
    success: true,
    deletedId: id,
    deletedName: current.title,
    message: `'${current.title}' 양식이 삭제되었습니다.`,
    forms: updatedForms.map(f => {
      let parsedFields = null;
      if (f.fields_config) {
        try { parsedFields = JSON.parse(f.fields_config); } catch {}
      }
      return {
        id: f.id,
        name: f.title,
        version: f.version,
        text: f.content,
        pdfPath: f.pdf_path || null,
        fileName: f.file_name || null,
        fieldsConfig: parsedFields || DEFAULT_RENTAL_FIELDS_CONFIG
      };
    })
  });
});

// 4. Get Audit Logs
router.get('/audit-logs', requireAuth, (req, res) => {
  const logs = db.prepare(`
    SELECT a.*, p.title as project_title
    FROM audit_logs a
    LEFT JOIN projects p ON a.project_id = p.id
    ORDER BY a.id DESC LIMIT 100
  `).all();
  res.json({ logs });
});

// 4b. Get Integration Configs (SMS / KakaoTalk / PG)
router.get('/integrations', requireAuth, requireMenu('settings'), (req, res) => {
  const rows = db.prepare('SELECT key, config_json, updated_by, updated_at FROM integration_configs').all();
  const configs = {};
  for (const r of rows) {
    try {
      configs[r.key] = { ...JSON.parse(r.config_json), updatedBy: r.updated_by, updatedAt: r.updated_at };
    } catch {}
  }
  res.json({ configs });
});

// 4c. Save Integration Config
router.put('/integrations/:key', requireAuth, requireMenu('settings'), (req, res) => {
  const { key } = req.params;
  const payload = req.body || {};
  db.prepare(`
    INSERT INTO integration_configs (key, config_json, updated_by, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      config_json = excluded.config_json,
      updated_by = excluded.updated_by,
      updated_at = CURRENT_TIMESTAMP
  `).run(key, JSON.stringify(payload), req.user?.name || '관리자');

  res.json({ success: true, message: '연동 설정이 저장되었습니다.' });
});

// 5. Reset Database to Initial Seed
router.post('/reset', requireAuth, requireRole('hq_admin'), (req, res) => {
  const { confirm } = req.body;
  if (confirm !== '초기화') {
    return res.status(400).json({ error: '확인 문구에 "초기화"를 입력해 주세요.' });
  }

  // Clean up private vault objects before wiping DB
  try {
    const docs = db.prepare('SELECT private_object_key FROM rental_document_versions').all();
    for (const d of docs) {
      deleteEncryptedObject(d.private_object_key);
    }
  } catch {}

  // Clear tables
  db.pragma('foreign_keys = OFF');
  try {
    db.exec(`
      DELETE FROM audit_logs;
      DELETE FROM quote_dispatches;
      DELETE FROM customer_consult_requests;
      DELETE FROM quote_views;
      DELETE FROM otp_verifications;
      DELETE FROM cash_receipts;
      DELETE FROM payment_orders;
      DELETE FROM rental_idempotency_keys;
      DELETE FROM rental_audit_events;
      DELETE FROM rental_supplement_requests;
      DELETE FROM rental_signature_evidence;
      DELETE FROM rental_consent_snapshots;
      DELETE FROM rental_document_versions;
      DELETE FROM rental_applicant_private;
      DELETE FROM rental_applications;
      DELETE FROM contracts;
      DELETE FROM quote_items;
      DELETE FROM quotes;
      DELETE FROM estimate_sources;
      DELETE FROM consultations;
      DELETE FROM projects;
      DELETE FROM customers;
      DELETE FROM users;
      DELETE FROM organizations;
      DELETE FROM system_labels;
      DELETE FROM system_stages;
      DELETE FROM system_contract_statuses;
      DELETE FROM products;
      DELETE FROM consent_forms;
      DELETE FROM consent_history;
    `);
  } finally {
    db.pragma('foreign_keys = ON');
  }

  seedDatabase();
  res.json({ message: '데이터가 초기화되었습니다.' });
});

export default router;
