import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { requireAuth, requireMenu } from '../middleware/auth.js';
import { serializeUser } from '../utils/menuPermissions.js';

const router = express.Router();

// Helper to format partner row
function formatPartnerRow(p) {
  return {
    id: p.code || `P${String(p.id).padStart(3, '0')}`,
    orgId: p.id,
    name: p.name,
    code: p.code,
    person: p.person || '담당자',
    email: p.email || 'partner@example.com',
    phone: p.phone || '',
    type: p.partner_type || '인테리어',
    active: Boolean(p.active ?? true),
    parentId: p.parent_id || null,
    parentName: p.parent_name || (p.parent_id ? '상위 파트너' : '본사 직속 (1차 파트너)'),
    level: p.level || 1,
    levelLabel: `${p.level || 1}차 파트너`,
    subPartnerCount: p.sub_partner_count || 0,
    customerCount: p.customer_count || 0,
    contractCount: p.contract_count || 0,
    username: p.username || '',
    createdAt: p.created_at
  };
}

// 1. List partners
router.get('/', requireAuth, (req, res) => {
  const isPartner = req.user.role === 'partner';
  const myOrgId = req.user.org_id;

  let query = `
    SELECT o.id, o.name, o.code, o.phone, o.address, o.parent_id, o.level, o.created_at,
           parent.name as parent_name,
           u.id as user_id, u.username, u.name as person, u.email, u.active,
           (SELECT COUNT(*) FROM organizations sub WHERE sub.parent_id = o.id) as sub_partner_count,
           (SELECT COUNT(*) FROM projects pr WHERE pr.org_id = o.id OR pr.partner_name = o.name) as customer_count,
           (SELECT COUNT(*) FROM contracts ct JOIN projects pr ON ct.project_id = pr.id WHERE pr.org_id = o.id OR pr.partner_name = o.name) as contract_count
    FROM organizations o
    LEFT JOIN organizations parent ON o.parent_id = parent.id
    LEFT JOIN users u ON u.org_id = o.id AND u.role = 'partner'
    WHERE o.type = 'partner'
  `;
  const params = [];

  // If partner user, only return their child/sub-partners (or if no children, themselves)
  if (isPartner) {
    query += ' AND (o.parent_id = ? OR o.id = ?)';
    params.push(myOrgId, myOrgId);
  }

  query += ' ORDER BY o.level ASC, o.id ASC';

  const rows = db.prepare(query).all(...params);
  const partners = rows.map(formatPartnerRow);

  // If partner user, also separate subPartners for clarity
  const subPartners = isPartner
    ? partners.filter(p => p.parentId === myOrgId)
    : partners;

  res.json({
    partners,
    subPartners,
    isPartner,
    myOrgId: isPartner ? myOrgId : null,
    totalCount: partners.length
  });
});

// 2. Register new partner
router.post('/', requireAuth, requireMenu('partners'), (req, res) => {
  const {
    name,
    person,
    email,
    phone,
    type = '인테리어',
    parentId = null,
    username = '',
    password = ''
  } = req.body || {};

  const cleanName = String(name || '').trim();
  if (!cleanName) {
    return res.status(400).json({ error: '파트너사명을 입력해 주세요.' });
  }

  const cleanPhone = String(phone || '').trim();
  if (!cleanPhone) {
    return res.status(400).json({ error: '파트너 대표 연락처(전화번호)를 입력해 주세요.' });
  }

  let targetUsername = String(username || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!targetUsername) {
    return res.status(400).json({ error: '파트너 어드민 접속 및 전용 랜딩 서브도메인에 사용할 아이디를 입력해 주세요.' });
  }

  const cleanPassword = String(password || '').trim();
  if (!cleanPassword || cleanPassword.length < 4) {
    return res.status(400).json({ error: '파트너 어드민 접속 비밀번호를 4자리 이상 입력해 주세요.' });
  }

  // Check username duplicate
  const dupUser = db.prepare('SELECT id FROM users WHERE username = ?').get(targetUsername);
  if (dupUser) {
    return res.status(400).json({ error: `이미 사용 중인 로그인 아이디(${targetUsername})입니다. 다른 아이디를 입력해 주세요.` });
  }

  // Check name duplicate
  const existingOrg = db.prepare('SELECT id FROM organizations WHERE name = ?').get(cleanName);
  if (existingOrg) {
    return res.status(400).json({ error: `이미 등록된 파트너사명(${cleanName})입니다.` });
  }

  // Determine parent partner & level
  let targetParentId = null;
  let targetLevel = 1;

  if (req.user.role === 'partner') {
    // If a partner is creating a sub-partner, forced parent is current partner's org
    targetParentId = req.user.org_id;
  } else if (parentId && Number(parentId) > 0) {
    targetParentId = Number(parentId);
  }

  if (targetParentId) {
    const parentOrg = db.prepare('SELECT id, name, level FROM organizations WHERE id = ?').get(targetParentId);
    if (parentOrg) {
      targetLevel = (parentOrg.level || 1) + 1;
    } else {
      targetParentId = null;
    }
  }

  // Generate unique code (P001, P002...)
  const count = db.prepare("SELECT COUNT(*) as cnt FROM organizations WHERE type = 'partner'").get().cnt;
  let code = `P${String(count + 1).padStart(3, '0')}`;
  let codeCheck = db.prepare('SELECT id FROM organizations WHERE code = ?').get(code);
  let offset = 2;
  while (codeCheck) {
    code = `P${String(count + offset).padStart(3, '0')}`;
    codeCheck = db.prepare('SELECT id FROM organizations WHERE code = ?').get(code);
    offset++;
  }

  // Insert organization
  const orgRes = db.prepare(`
    INSERT INTO organizations (name, type, code, phone, parent_id, level)
    VALUES (?, 'partner', ?, ?, ?, ?)
  `).run(cleanName, code, phone || '', targetParentId, targetLevel);

  const newOrgId = Number(orgRes.lastInsertRowid);

  // Ensure username uniqueness fallback
  let unameCheck = db.prepare('SELECT id FROM users WHERE username = ?').get(targetUsername);
  let uSuffix = 1;
  const baseUsername = targetUsername;
  while (unameCheck) {
    targetUsername = `${baseUsername}_${uSuffix}`;
    unameCheck = db.prepare('SELECT id FROM users WHERE username = ?').get(targetUsername);
    uSuffix++;
  }

  const rawPassword = String(password || '').trim() || 'partner123!';
  const passwordHash = bcrypt.hashSync(rawPassword, 10);
  const contactPerson = String(person || '').trim() || cleanName;
  const partnerEmail = String(email || '').trim() || `${targetUsername}@example.com`;

  // Partner default allowed menus: 고객관리, 상품관리, 통계관리
  const defaultMenus = JSON.stringify(['customers', 'products', 'stats']);

  const userRes = db.prepare(`
    INSERT INTO users (org_id, username, password_hash, name, phone, email, role, allowed_menus, active)
    VALUES (?, ?, ?, ?, ?, ?, 'partner', ?, 1)
  `).run(newOrgId, targetUsername, passwordHash, contactPerson, phone || '', partnerEmail, defaultMenus);

  // If this new partner has a parent partner, ensure the parent partner has 'partners' menu enabled in users table!
  if (targetParentId) {
    const parentUsers = db.prepare("SELECT id, allowed_menus FROM users WHERE org_id = ? AND role = 'partner'").all(targetParentId);
    for (const pu of parentUsers) {
      let menus = [];
      try { menus = JSON.parse(pu.allowed_menus); } catch { menus = ['customers', 'products', 'stats']; }
      if (Array.isArray(menus) && !menus.includes('partners')) {
        menus.push('partners');
        db.prepare('UPDATE users SET allowed_menus = ? WHERE id = ?').run(JSON.stringify(menus), pu.id);
      }
    }
  }

  res.status(201).json({
    id: code,
    orgId: newOrgId,
    name: cleanName,
    code,
    level: targetLevel,
    parentId: targetParentId,
    username: targetUsername,
    person: contactPerson,
    message: `${targetLevel}차 파트너 [${cleanName}] 및 관리자 계정(${targetUsername})이 등록되었습니다.`
  });
});

// 3. Update partner
router.put('/:id', requireAuth, requireMenu('partners'), (req, res) => {
  const targetId = Number(req.params.id);
  const { name, person, email, phone, parentId } = req.body || {};

  const org = db.prepare("SELECT * FROM organizations WHERE id = ? AND type = 'partner'").get(targetId);
  if (!org) {
    return res.status(404).json({ error: '파트너를 찾을 수 없습니다.' });
  }

  // If partner user, can only edit their sub-partners
  if (req.user.role === 'partner' && org.parent_id !== req.user.org_id) {
    return res.status(403).json({ error: '소속 하위 파트너 정보만 수정할 수 있습니다.' });
  }

  let nextParentId = org.parent_id;
  let nextLevel = org.level;

  if (req.user.role === 'hq_admin' && parentId !== undefined) {
    if (parentId && Number(parentId) > 0 && Number(parentId) !== targetId) {
      const pOrg = db.prepare('SELECT id, level FROM organizations WHERE id = ?').get(Number(parentId));
      if (pOrg) {
        nextParentId = pOrg.id;
        nextLevel = (pOrg.level || 1) + 1;
      }
    } else if (parentId === null || parentId === '' || Number(parentId) === 0) {
      nextParentId = null;
      nextLevel = 1;
    }
  }

  db.prepare(`
    UPDATE organizations
    SET name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        parent_id = ?,
        level = ?
    WHERE id = ?
  `).run(name || org.name, phone !== undefined ? phone : org.phone, nextParentId, nextLevel, targetId);

  // Update associated partner user if person or email changed
  if (person || email || phone) {
    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone)
      WHERE org_id = ? AND role = 'partner'
    `).run(person || null, email || null, phone || null, targetId);
  }

  res.json({ message: '파트너 정보가 수정되었습니다.' });
});

export default router;
