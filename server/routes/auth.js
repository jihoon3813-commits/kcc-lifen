import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { config } from '../config.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { recordAuditLog } from '../middleware/audit.js';

const router = express.Router();

// 1. Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해 주세요.' });
  }

  const user = db.prepare(`
    SELECT u.*, o.name as org_name, o.type as org_type
    FROM users u
    JOIN organizations o ON u.org_id = o.id
    WHERE u.username = ?
  `).get(username);

  if (!user || !user.active) {
    return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않거나 비활성화된 계정입니다.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, org_id: user.org_id },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// 2. Quick Switch (for seamless testing / role switching in demo mode)
router.post('/switch-role', (req, res) => {
  const { roleName } = req.body; // e.g. '본사 관리자', '상담사', '견적 담당자', '파트너 관리자', '회계 담당자'
  const roleMap = {
    '본사 관리자': 'admin',
    '상담사': 'youngjin',
    '견적 담당자': 'jeongyeon',
    '파트너 관리자': 'partner_hanbit',
    '한빛인테리어': 'partner_hanbit',
    '회계 담당자': 'jihee'
  };

  const targetUsername = roleMap[roleName] || 'admin';
  const user = db.prepare(`
    SELECT u.*, o.name as org_name, o.type as org_type
    FROM users u
    JOIN organizations o ON u.org_id = o.id
    WHERE u.username = ?
  `).get(targetUsername);

  if (!user) {
    return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, org_id: user.org_id },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// 3. Current User Info
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// 4. List Users (Settings)
router.get('/users', requireAuth, (req, res) => {
  // If partner, can only see users of their own org
  let query = `
    SELECT u.id, u.username, u.name, u.phone, u.email, u.role, u.active, u.created_at,
           o.id as org_id, o.name as org_name, o.type as org_type
    FROM users u
    JOIN organizations o ON u.org_id = o.id
  `;
  const params = [];

  if (req.user.role === 'partner') {
    query += ' WHERE u.org_id = ?';
    params.push(req.user.org_id);
  }
  query += ' ORDER BY u.id ASC';

  const users = db.prepare(query).all(...params);
  res.json({ users });
});

// 5. Create User
router.post('/users', requireAuth, requireRole('hq_admin'), (req, res) => {
  const { username, password, name, phone, email, role, org_id } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: '필수 정보를 모두 입력해 주세요.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(400).json({ error: '이미 사용 중인 아이디입니다.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const targetOrgId = org_id || req.user.org_id;

  const result = db.prepare(`
    INSERT INTO users (org_id, username, password_hash, name, phone, email, role, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(targetOrgId, username, passwordHash, name, phone || '', email || '', role || 'consultant');

  recordAuditLog({
    action: '사용자 생성',
    detail: `새 사용자 등록: ${name} (${username}, ${role})`,
    req
  });

  res.status(201).json({ id: result.lastInsertRowid, message: '사용자가 등록되었습니다.' });
});

export default router;
