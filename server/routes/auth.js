import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { config } from '../config.js';
import { requireAuth, requireMenu } from '../middleware/auth.js';
import { recordAuditLog } from '../middleware/audit.js';
import {
  ALL_MENUS,
  MENU_LABEL_MAP,
  normalizeRoleCode,
  getDefaultMenusForRole,
  validateRequestedMenus,
  serializeUser
} from '../utils/menuPermissions.js';

const router = express.Router();

function fetchUserById(id) {
  return db.prepare(`
    SELECT u.*, o.name as org_name, o.type as org_type
    FROM users u
    JOIN organizations o ON u.org_id = o.id
    WHERE u.id = ?
  `).get(id);
}

function resolveOrgId({ org_id, org, org_name, fallbackOrgId }) {
  if (org_id) {
    const found = db.prepare('SELECT id FROM organizations WHERE id = ?').get(Number(org_id));
    if (found) return found.id;
  }
  const targetName = (org_name || org || '').trim();
  if (targetName) {
    const byName = db.prepare('SELECT id FROM organizations WHERE name = ?').get(targetName);
    if (byName) return byName.id;
    const count = db.prepare("SELECT COUNT(*) as cnt FROM organizations WHERE type = 'partner'").get().cnt;
    const code = `P${String(count + 1).padStart(3, '0')}`;
    const inserted = db.prepare(`
      INSERT INTO organizations (name, type, code, phone)
      VALUES (?, 'partner', ?, '')
    `).run(targetName, code);
    return Number(inserted.lastInsertRowid);
  }
  return fallbackOrgId || 1;
}

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

  res.json({ token, user: serializeUser(user) });
});

// 2. Quick Switch (supports switching by userId, username, or legacy roleName)
function handleSwitchAccount(req, res) {
  const { userId, username, roleName } = req.body || {};

  let user = null;
  if (userId) {
    user = db.prepare(`
      SELECT u.*, o.name as org_name, o.type as org_type
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      WHERE u.id = ? AND u.active = 1
    `).get(Number(userId));
  }

  if (!user && username) {
    user = db.prepare(`
      SELECT u.*, o.name as org_name, o.type as org_type
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      WHERE u.username = ? AND u.active = 1
    `).get(String(username).trim());
  }

  if (!user && roleName) {
    const roleMap = {
      '본사 관리자': 'admin',
      '최고관리자': 'admin',
      '상담사': 'youngjin',
      '견적 담당자': 'jeongyeon',
      '파트너 관리자': 'partner_hanbit',
      '한빛인테리어': 'partner_hanbit',
      '리움디자인': 'partner_rium',
      '회계 담당자': 'jihee',
      '회계·정산': 'jihee'
    };
    const mappedUsername = roleMap[roleName];
    if (mappedUsername) {
      user = db.prepare(`
        SELECT u.*, o.name as org_name, o.type as org_type
        FROM users u
        JOIN organizations o ON u.org_id = o.id
        WHERE u.username = ? AND u.active = 1
      `).get(mappedUsername);
    } else {
      user = db.prepare(`
        SELECT u.*, o.name as org_name, o.type as org_type
        FROM users u
        JOIN organizations o ON u.org_id = o.id
        WHERE (u.username = ? OR u.name = ? OR o.name = ?) AND u.active = 1
        ORDER BY u.id ASC LIMIT 1
      `).get(roleName, roleName, roleName);
    }
  }

  if (!user) {
    user = db.prepare(`
      SELECT u.*, o.name as org_name, o.type as org_type
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      WHERE u.active = 1
      ORDER BY u.id ASC LIMIT 1
    `).get();
  }

  if (!user) {
    return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, org_id: user.org_id },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  res.json({ token, user: serializeUser(user) });
}

router.post('/switch-role', handleSwitchAccount);
router.post('/switch-user', handleSwitchAccount);

// 2b. Active User Roster (for workspace account switcher & menu catalog)
router.get('/roster', (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.username, u.name, u.phone, u.email, u.role, u.allowed_menus, u.active, u.created_at,
           o.id as org_id, o.name as org_name, o.type as org_type
    FROM users u
    JOIN organizations o ON u.org_id = o.id
    WHERE u.active = 1
    ORDER BY u.id ASC
  `).all();

  res.json({
    menus: ALL_MENUS,
    users: rows.map(serializeUser)
  });
});

// 3. Current User Info
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// 4. List Users (Settings > User Management)
router.get('/users', requireAuth, (req, res) => {
  let query = `
    SELECT u.id, u.username, u.name, u.phone, u.email, u.role, u.allowed_menus, u.active, u.created_at,
           o.id as org_id, o.name as org_name, o.type as org_type
    FROM users u
    JOIN organizations o ON u.org_id = o.id
    WHERE u.active = 1
  `;
  const params = [];

  if (req.user.role === 'partner' && !req.user.allowed_menus?.includes('settings')) {
    query += ' AND u.org_id = ?';
    params.push(req.user.org_id);
  }
  query += ' ORDER BY u.id ASC';

  const rows = db.prepare(query).all(...params);
  res.json({
    menus: ALL_MENUS,
    users: rows.map(serializeUser)
  });
});

// 5. Create User (with customizable allowed_menus)
router.post('/users', requireAuth, requireMenu('settings'), (req, res) => {
  const { username, password, name, phone, email, role, org_id, org, org_name, allowed_menus } = req.body || {};

  const cleanUsername = String(username || '').trim();
  const cleanName = String(name || '').trim();
  if (!cleanUsername || !cleanName) {
    return res.status(400).json({ error: '이름과 로그인 아이디를 입력해 주세요.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
  if (existing) {
    return res.status(400).json({ error: '이미 사용 중인 아이디입니다.' });
  }

  const roleCode = normalizeRoleCode(role);
  let menusToSave = getDefaultMenusForRole(roleCode);
  if (allowed_menus !== undefined) {
    const check = validateRequestedMenus(allowed_menus, cleanUsername);
    if (!check.ok) {
      return res.status(400).json({ error: check.error });
    }
    menusToSave = check.menus;
  }

  const rawPassword = String(password || '').trim() || 'user123!';
  const passwordHash = bcrypt.hashSync(rawPassword, 10);
  const targetOrgId = resolveOrgId({ org_id, org, org_name, fallbackOrgId: req.user.org_id });

  const result = db.prepare(`
    INSERT INTO users (org_id, username, password_hash, name, phone, email, role, allowed_menus, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    targetOrgId,
    cleanUsername,
    passwordHash,
    cleanName,
    String(phone || '').trim(),
    String(email || '').trim(),
    roleCode,
    JSON.stringify(menusToSave)
  );

  const created = fetchUserById(result.lastInsertRowid);
  const menuNames = menusToSave.map(k => MENU_LABEL_MAP[k] || k).join(', ');

  recordAuditLog({
    action: '사용자 생성',
    detail: `새 사용자 등록: ${cleanName} (${cleanUsername}, 허용 메뉴: ${menuNames})`,
    req
  });

  res.status(201).json({
    id: result.lastInsertRowid,
    user: serializeUser(created),
    message: '사용자가 등록되었습니다.'
  });
});

// 6. Update User Info & Allowed Menus
function handleUpdateUser(req, res) {
  const userId = Number(req.params.id);
  if (!userId) {
    return res.status(400).json({ error: '유효하지 않은 사용자 ID입니다.' });
  }

  const current = fetchUserById(userId);
  if (!current) {
    return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  }

  const { name, phone, email, role, org_id, org, org_name, active, password, allowed_menus } = req.body || {};

  const nextRole = role !== undefined ? normalizeRoleCode(role) : current.role;
  let nextMenus = serializeUser(current).allowed_menus;

  if (allowed_menus !== undefined) {
    const check = validateRequestedMenus(allowed_menus, current.username);
    if (!check.ok) {
      return res.status(400).json({ error: check.error });
    }
    nextMenus = check.menus;
  }

  const nextName = name !== undefined && String(name).trim() ? String(name).trim() : current.name;
  const nextPhone = phone !== undefined ? String(phone).trim() : (current.phone || '');
  const nextEmail = email !== undefined ? String(email).trim() : (current.email || '');
  const nextOrgId = (org_id !== undefined || org !== undefined || org_name !== undefined)
    ? resolveOrgId({ org_id, org, org_name, fallbackOrgId: current.org_id })
    : current.org_id;

  let nextActive = current.active;
  if (active !== undefined) {
    if (current.username === 'admin' && !active) {
      return res.status(400).json({ error: '최고관리자(admin) 계정은 비활성화할 수 없습니다.' });
    }
    nextActive = active ? 1 : 0;
  }

  if (password && String(password).trim()) {
    const passwordHash = bcrypt.hashSync(String(password).trim(), 10);
    db.prepare(`
      UPDATE users
      SET org_id = ?, name = ?, phone = ?, email = ?, role = ?, allowed_menus = ?, active = ?, password_hash = ?
      WHERE id = ?
    `).run(nextOrgId, nextName, nextPhone, nextEmail, nextRole, JSON.stringify(nextMenus), nextActive, passwordHash, userId);
  } else {
    db.prepare(`
      UPDATE users
      SET org_id = ?, name = ?, phone = ?, email = ?, role = ?, allowed_menus = ?, active = ?
      WHERE id = ?
    `).run(nextOrgId, nextName, nextPhone, nextEmail, nextRole, JSON.stringify(nextMenus), nextActive, userId);
  }

  const updated = fetchUserById(userId);
  const menuNames = nextMenus.map(k => MENU_LABEL_MAP[k] || k).join(', ');

  recordAuditLog({
    action: '사용자 메뉴 권한 변경',
    detail: `${updated.name} (${updated.username}) 표시 메뉴 설정: [${menuNames}]`,
    req
  });

  res.json({
    success: true,
    user: serializeUser(updated),
    message: '사용자 권한 및 표시 메뉴 설정이 저장되었습니다.'
  });
}

router.patch('/users/:id', requireAuth, requireMenu('settings'), handleUpdateUser);
router.patch('/users/:id/menus', requireAuth, requireMenu('settings'), handleUpdateUser);

export default router;
