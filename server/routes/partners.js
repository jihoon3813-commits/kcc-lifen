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
  const rawId = req.params.id;
  const numId = Number(rawId);
  let org = null;
  if (!isNaN(numId) && numId > 0) {
    org = db.prepare("SELECT * FROM organizations WHERE id = ? AND type = 'partner'").get(numId);
  }
  if (!org) {
    org = db.prepare("SELECT * FROM organizations WHERE (code = ? OR name = ?) AND type = 'partner'").get(rawId, rawId);
  }
  if (!org) {
    return res.status(404).json({ error: '파트너를 찾을 수 없습니다.' });
  }

  const targetId = org.id;

  // If partner user, can only edit their sub-partners
  if (req.user.role === 'partner' && org.parent_id !== req.user.org_id) {
    return res.status(403).json({ error: '소속 하위 파트너 정보만 수정할 수 있습니다.' });
  }

  const { name, person, email, phone, parentId, username, password } = req.body || {};

  // Check duplicate name if name changed
  const cleanName = name ? String(name).trim() : org.name;
  if (cleanName && cleanName !== org.name) {
    const dupOrg = db.prepare("SELECT id FROM organizations WHERE name = ? AND id != ?").get(cleanName, targetId);
    if (dupOrg) {
      return res.status(400).json({ error: `이미 등록된 다른 파트너사명(${cleanName})입니다.` });
    }
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
  `).run(cleanName || org.name, phone !== undefined ? phone : org.phone, nextParentId, nextLevel, targetId);

  // Manage associated partner user
  const existingUser = db.prepare("SELECT * FROM users WHERE org_id = ? AND role = 'partner'").get(targetId);

  if (existingUser) {
    let newUsername = existingUser.username;
    if (username) {
      const cleanU = String(username).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (cleanU && cleanU !== existingUser.username) {
        const dupUser = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(cleanU, existingUser.id);
        if (dupUser) {
          return res.status(400).json({ error: `이미 사용 중인 로그인 아이디(${cleanU})입니다.` });
        }
        newUsername = cleanU;
      }
    }

    let newPasswordHash = existingUser.password_hash;
    if (password && String(password).trim().length >= 4) {
      newPasswordHash = bcrypt.hashSync(String(password).trim(), 10);
    }

    db.prepare(`
      UPDATE users
      SET username = ?,
          password_hash = ?,
          name = COALESCE(?, name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone)
      WHERE id = ?
    `).run(
      newUsername,
      newPasswordHash,
      person || null,
      email || null,
      phone !== undefined ? phone : null,
      existingUser.id
    );
  } else {
    // No user was linked ("계정 미등록" state) - create user if username or registration provided
    let targetUsername = username ? String(username).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') : '';
    if (!targetUsername) {
      targetUsername = `partner_${(org.code || String(targetId)).toLowerCase()}`;
    }

    // Ensure username uniqueness
    let unameCheck = db.prepare('SELECT id FROM users WHERE username = ?').get(targetUsername);
    let uSuffix = 1;
    const baseUsername = targetUsername;
    while (unameCheck) {
      targetUsername = `${baseUsername}_${uSuffix}`;
      unameCheck = db.prepare('SELECT id FROM users WHERE username = ?').get(targetUsername);
      uSuffix++;
    }

    const cleanPw = String(password || '').trim() || 'partner123!';
    const passwordHash = bcrypt.hashSync(cleanPw, 10);
    const contactPerson = String(person || '').trim() || cleanName;
    const partnerEmail = String(email || '').trim() || `${targetUsername}@example.com`;
    const defaultMenus = JSON.stringify(['customers', 'products', 'stats']);

    db.prepare(`
      INSERT INTO users (org_id, username, password_hash, name, phone, email, role, allowed_menus, active)
      VALUES (?, ?, ?, ?, ?, ?, 'partner', ?, 1)
    `).run(targetId, targetUsername, passwordHash, contactPerson, phone || '', partnerEmail, defaultMenus);
  }

  res.json({ message: '파트너 정보 및 계정이 정상적으로 수정되었습니다.' });
});

// 4. Delete partner
router.delete('/:id', requireAuth, requireMenu('partners'), (req, res) => {
  const rawId = req.params.id;
  const numId = Number(rawId);
  let org = null;
  if (!isNaN(numId) && numId > 0) {
    org = db.prepare("SELECT * FROM organizations WHERE id = ? AND type = 'partner'").get(numId);
  }
  if (!org) {
    org = db.prepare("SELECT * FROM organizations WHERE (code = ? OR name = ?) AND type = 'partner'").get(rawId, rawId);
  }
  if (!org) {
    return res.status(404).json({ error: '삭제할 파트너 정보를 찾을 수 없습니다.' });
  }

  const isPartner = req.user.role === 'partner';
  if (isPartner && org.parent_id !== req.user.org_id) {
    return res.status(403).json({ error: '소속 직속 하위 파트너만 삭제할 수 있습니다.' });
  }

  // 1. Check if child/sub-partners exist
  const childCount = db.prepare("SELECT COUNT(*) as cnt FROM organizations WHERE parent_id = ?").get(org.id).cnt;
  if (childCount > 0) {
    return res.status(400).json({
      error: `직속 하위 2차 파트너(${childCount}개사)가 등록되어 있어 삭제할 수 없습니다. 하위 파트너를 먼저 삭제하거나 상위 파트너를 변경해 주세요.`
    });
  }

  // 2. Check if customer or contract data exists
  const custCount = db.prepare("SELECT COUNT(*) as cnt FROM projects WHERE org_id = ? OR partner_name = ?").get(org.id, org.name).cnt;
  const ctCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM contracts ct
    JOIN projects pr ON ct.project_id = pr.id
    WHERE pr.org_id = ? OR pr.partner_name = ?
  `).get(org.id, org.name).cnt;

  if (custCount > 0 || ctCount > 0) {
    return res.status(400).json({
      error: `해당 파트너에 등록된 고객(${custCount}건) 또는 계약(${ctCount}건) 실적 데이터가 존재하여 삭제할 수 없습니다.`
    });
  }

  // 3. Delete partner users & organization in transaction
  const delTx = db.transaction(() => {
    db.prepare("DELETE FROM users WHERE org_id = ?").run(org.id);
    db.prepare("DELETE FROM organizations WHERE id = ?").run(org.id);
  });
  delTx();

  res.json({
    success: true,
    deletedId: org.id,
    deletedName: org.name,
    message: `[${org.name}] 파트너 및 관련 어드민 계정이 정상적으로 삭제되었습니다.`
  });
});

export default router;
