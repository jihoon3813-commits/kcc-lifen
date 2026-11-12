import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { config } from '../config.js';
import { serializeUser } from '../utils/menuPermissions.js';

export function authenticate(req, res, next) {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    let user = db.prepare(`
      SELECT u.id, u.org_id, u.username, u.name, u.email, u.phone, u.role, u.allowed_menus, u.active, u.created_at,
             o.name as org_name, o.type as org_type
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      WHERE u.id = ? AND u.active = 1
    `).get(decoded.id);

    if (!user && decoded.username) {
      user = db.prepare(`
        SELECT u.id, u.org_id, u.username, u.name, u.email, u.phone, u.role, u.allowed_menus, u.active, u.created_at,
               o.name as org_name, o.type as org_type
        FROM users u
        JOIN organizations o ON u.org_id = o.id
        WHERE u.username = ? AND u.active = 1
      `).get(decoded.username);
    }

    if (!user) {
      req.user = null;
      return next();
    }

    req.user = serializeUser(user);
    next();
  } catch (err) {
    req.user = null;
    next();
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }
  next();
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }
    // hq_admin has access to everything
    if (req.user.role === 'hq_admin') {
      return next();
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: '해당 기능에 접근 권한이 없습니다.' });
    }
    next();
  };
}

export function requireMenu(menuKey) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }
    if (req.user.role === 'hq_admin') {
      return next();
    }
    if (Array.isArray(req.user.allowed_menus) && req.user.allowed_menus.includes(menuKey)) {
      return next();
    }
    return res.status(403).json({ error: '해당 메뉴에 대한 접근 권한이 없습니다.' });
  };
}

/**
 * Ensures partner users only access their own organization's records
 */
export function checkPartnerAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }
  // HQ roles can access all organizations
  if (['hq_admin', 'consultant', 'estimator', 'accountant'].includes(req.user.role)) {
    return next();
  }
  // Partner role: restrict to own org_id
  req.partnerOrgId = req.user.org_id;
  next();
}
