import express from 'express';
import { db } from '../db/index.js';
import { requireAuth, requireRole, requireMenu } from '../middleware/auth.js';
import { seedDatabase } from '../db/seed.js';
import { deleteEncryptedObject } from '../utils/rentalSecurity.js';

const router = express.Router();

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

// 3. Get Consent Forms
router.get('/forms', requireAuth, (req, res) => {
  const forms = db.prepare('SELECT * FROM consent_forms ORDER BY id ASC').all();
  res.json({
    forms: forms.map(f => ({
      id: f.id,
      name: f.title,
      version: f.version,
      text: f.content
    }))
  });
});

// Update Consent Form (Saves previous version to history)
router.patch('/forms/:id', requireAuth, requireMenu('settings'), (req, res) => {
  const { id } = req.params;
  const { text } = req.body;

  const current = db.prepare('SELECT * FROM consent_forms WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: '양식을 찾을 수 없습니다.' });

  // Record history
  db.prepare(`
    INSERT INTO consent_history (form_id, version, content, updated_by)
    VALUES (?, ?, ?, ?)
  `).run(id, current.version, current.content, req.user.name);

  // Update to new version
  const newVer = current.version + 1;
  db.prepare(`
    UPDATE consent_forms
    SET version = ?, content = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newVer, text, id);

  res.json({ success: true, version: newVer, message: '새 양식 버전이 저장되었습니다.' });
});

// Create Consent Form
router.post('/forms', requireAuth, requireMenu('settings'), (req, res) => {
  const { name, text } = req.body;
  const title = (name || '').trim();
  const content = (text || '').trim();

  if (!title) return res.status(400).json({ error: '양식 명칭을 입력해 주세요.' });
  if (!content) return res.status(400).json({ error: '양식 내용을 입력해 주세요.' });

  const id = 'form_' + Date.now();
  db.prepare(`
    INSERT INTO consent_forms (id, title, version, content)
    VALUES (?, ?, 1, ?)
  `).run(id, title, content);

  const updatedForms = db.prepare('SELECT * FROM consent_forms ORDER BY id ASC').all();
  res.json({
    success: true,
    message: `'${title}' 양식이 추가되었습니다.`,
    forms: updatedForms.map(f => ({
      id: f.id,
      name: f.title,
      version: f.version,
      text: f.content
    }))
  });
});

// Delete Consent Form
router.delete('/forms/:id', requireAuth, requireMenu('settings'), (req, res) => {
  const { id } = req.params;

  const current = db.prepare('SELECT * FROM consent_forms WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: '삭제할 양식을 찾을 수 없습니다.' });

  const total = db.prepare('SELECT COUNT(*) as count FROM consent_forms').get().count;
  if (total <= 1) {
    return res.status(400).json({ error: '최소 1개 이상의 양식 및 동의서는 유지되어야 합니다.' });
  }

  const delTx = db.transaction(() => {
    db.prepare('DELETE FROM consent_history WHERE form_id = ?').run(id);
    db.prepare('DELETE FROM consent_forms WHERE id = ?').run(id);
  });
  delTx();

  const updatedForms = db.prepare('SELECT * FROM consent_forms ORDER BY id ASC').all();
  res.json({
    success: true,
    deletedId: id,
    deletedName: current.title,
    message: `'${current.title}' 양식이 삭제되었습니다.`,
    forms: updatedForms.map(f => ({
      id: f.id,
      name: f.title,
      version: f.version,
      text: f.content
    }))
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

  seedDatabase();
  res.json({ message: '데이터가 초기화되었습니다.' });
});

export default router;
