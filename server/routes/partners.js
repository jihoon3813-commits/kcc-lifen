import express from 'express';
import { db } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// List partners
router.get('/', requireAuth, (req, res) => {
  const partners = db.prepare(`
    SELECT o.id, o.name, o.code, o.phone, o.address,
           u.name as person, u.email
    FROM organizations o
    LEFT JOIN users u ON u.org_id = o.id AND u.role = 'partner'
    WHERE o.type = 'partner'
    ORDER BY o.id ASC
  `).all();

  res.json({
    partners: partners.map(p => ({
      id: p.code || `P${String(p.id).padStart(3, '0')}`,
      orgId: p.id,
      name: p.name,
      person: p.person || '담당자',
      email: p.email || 'partner@example.com',
      phone: p.phone || '',
      type: '인테리어',
      active: true
    }))
  });
});

// Register new partner
router.post('/', requireAuth, requireRole('hq_admin'), (req, res) => {
  const { name, person, email, phone, type = '인테리어' } = req.body;
  if (!name) return res.status(400).json({ error: '파트너사명을 입력해 주세요.' });

  const count = db.prepare("SELECT COUNT(*) as cnt FROM organizations WHERE type = 'partner'").get().cnt;
  const code = `P${String(count + 1).padStart(3, '0')}`;

  const orgRes = db.prepare(`
    INSERT INTO organizations (name, type, code, phone)
    VALUES (?, 'partner', ?, ?)
  `).run(name, code, phone || '');

  res.status(201).json({ id: code, orgId: orgRes.lastInsertRowid, message: '파트너가 등록되었습니다.' });
});

export default router;
