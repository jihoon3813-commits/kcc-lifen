import express from 'express';
import { db } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { seedDatabase } from '../db/seed.js';
import { deleteEncryptedObject } from '../utils/rentalSecurity.js';

const router = express.Router();

// 1. Get Labels
router.get('/labels', requireAuth, (req, res) => {
  const labels = db.prepare('SELECT name, color FROM system_labels ORDER BY id ASC').all();
  res.json({ labels });
});

// Add Label
router.post('/labels', requireAuth, requireRole('hq_admin'), (req, res) => {
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
router.patch('/forms/:id', requireAuth, requireRole('hq_admin'), (req, res) => {
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
router.get('/integrations', requireAuth, requireRole('hq_admin'), (req, res) => {
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
router.put('/integrations/:key', requireAuth, requireRole('hq_admin'), (req, res) => {
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
    DELETE FROM products;
    DELETE FROM consent_forms;
    DELETE FROM consent_history;
  `);

  seedDatabase();
  res.json({ message: '데이터가 초기화되었습니다.' });
});

export default router;
