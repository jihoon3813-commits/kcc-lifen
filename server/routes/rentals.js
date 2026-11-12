import express from 'express';
import { db, hydrateLegacyRentalApplication } from '../db/index.js';
import { requireAuth, checkPartnerAccess } from '../middleware/auth.js';
import { recordAuditLog } from '../middleware/audit.js';
import { maskPhone } from '../utils/mobileQuoteFormatter.js';
import {
  STATUS_LABELS,
  STATUS_CODE_TO_KR,
  normalizeStatusCode,
  maskIp
} from '../utils/rentalSecurity.js';

const router = express.Router();

function nowKstSql() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

function toKstIso(ts) {
  if (!ts) return '';
  const s = String(ts).trim();
  if (s.includes('T') && (s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s))) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T09:00:00+09:00`;
  return s.replace(' ', 'T') + '+09:00';
}

// 1. List Rental Applications (CRM Workspace Sync)
router.get('/', requireAuth, checkPartnerAccess, (req, res) => {
  const { status } = req.query;

  let sql = `
    SELECT
      r.*,
      p.partner_name, p.owner_name,
      c.address as customer_address,
      priv.masked_phone
    FROM rental_applications r
    JOIN projects p ON r.project_id = p.id
    JOIN customers c ON p.customer_id = c.id
    LEFT JOIN rental_applicant_private priv ON r.id = priv.application_id
    WHERE 1=1
  `;
  const params = [];

  if (req.partnerOrgId) {
    sql += ' AND p.org_id = ?';
    params.push(req.partnerOrgId);
  }

  if (status && status !== 'all') {
    const code = normalizeStatusCode(status);
    sql += ' AND (r.status = ? OR r.status_code = ?)';
    params.push(status, code);
  }

  sql += ' ORDER BY r.created_at DESC';

  const rows = db.prepare(sql).all(...params);

  const applications = rows.map(r => {
    const code = normalizeStatusCode(r.status_code || r.status);
    return {
      id: r.id,
      cid: r.project_id,
      name: r.customer_name,
      phone: r.masked_phone || maskPhone(r.customer_phone || ''),
      address: r.customer_address,
      partner: r.partner_name,
      plan: r.plan_title ? `${r.plan_title} (${r.period_months}개월)` : `${r.period_months}개월`,
      planKey: r.plan_key || 'lowupfront',
      planTitle: r.plan_title || '60개월 렌탈',
      upfront: r.upfront_fee || 0,
      months: r.period_months || 60,
      monthly: r.monthly_fee,
      total: r.total_fee,
      status: STATUS_LABELS[code] || r.status,
      statusCode: code,
      revision: r.revision || 1,
      assignedTo: r.assigned_to || r.owner_name || '미배정',
      contractReference: r.contract_reference || '',
      checks: {
        id: Boolean(r.check_id),
        signature: Boolean(r.check_signature),
        consent: Boolean(r.check_consent)
      },
      consent: true,
      product: r.product_name || '창호',
      review: r.review_note || '',
      date: String(r.created_at || '').slice(0, 10),
      createdAt: toKstIso(r.created_at),
      createdAtText: String(r.created_at || '').slice(0, 16)
    };
  });

  res.json({ applications });
});

// 2. Get Single Rental Application
router.get('/:id', requireAuth, checkPartnerAccess, (req, res) => {
  const app = db.prepare(`
    SELECT r.*, p.org_id, p.partner_name, c.address as customer_address, priv.masked_phone, priv.masked_birth_date
    FROM rental_applications r
    JOIN projects p ON r.project_id = p.id
    JOIN customers c ON p.customer_id = c.id
    LEFT JOIN rental_applicant_private priv ON r.id = priv.application_id
    WHERE r.id = ?
  `).get(req.params.id);

  if (!app) return res.status(404).json({ error: '렌탈 신청을 찾을 수 없습니다.' });
  if (req.partnerOrgId && app.org_id !== req.partnerOrgId) {
    return res.status(403).json({ error: '접근 권한이 없습니다.' });
  }

  // Mask raw phone if present
  const safeApp = {
    ...app,
    customer_phone: app.masked_phone || maskPhone(app.customer_phone || ''),
    doc_id_card: undefined,
    doc_signature: undefined
  };
  res.json({ application: safeApp });
});

// 3. Submit Internal Staff Rental Application Record (CRM Backward Compatibility)
router.post('/', requireAuth, checkPartnerAccess, (req, res) => {
  const { projectId, quoteId, name, phone, plan = '60개월', signature } = req.body;

  const pId = parseInt(projectId, 10);
  const project = db.prepare('SELECT id, org_id, title, owner_name, product FROM projects WHERE id = ?').get(pId);
  if (!project) return res.status(404).json({ error: '공사건을 찾을 수 없습니다.' });
  if (req.partnerOrgId && project.org_id !== req.partnerOrgId) {
    return res.status(403).json({ error: '접근 권한이 없습니다.' });
  }

  let quote = null;
  if (quoteId) {
    quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(quoteId);
  } else {
    quote = db.prepare("SELECT * FROM quotes WHERE project_id = ? AND status = 'published' ORDER BY version DESC LIMIT 1").get(pId);
  }

  const months = parseInt(plan, 10) || 60;
  const quoteTotal = quote ? quote.total_price : 10000000;
  const monthly = Math.round((quoteTotal * 1.2) / months / 1000) * 1000;
  const totalFee = monthly * months;

  const nowKst = nowKstSql();
  const todayStr = nowKst.slice(2, 10).replace(/-/g, '');
  const countRow = db.prepare("SELECT COUNT(*) as cnt FROM rental_applications WHERE id LIKE ?").get(`R-${todayStr}%`);
  let seqNum = (countRow?.cnt || 0) + 1;
  let rentalId = `R-${todayStr}-${String(seqNum).padStart(3, '0')}`;
  while (db.prepare('SELECT id FROM rental_applications WHERE id = ?').get(rentalId)) {
    seqNum += 1;
    rentalId = `R-${todayStr}-${String(seqNum).padStart(3, '0')}`;
  }

  db.prepare(`
    INSERT INTO rental_applications (
      id, project_id, quote_id, quote_version, customer_name, customer_phone, product_name,
      period_months, monthly_fee, total_fee, status, status_code, assigned_to, doc_signature, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '접수완료', 'received', ?, ?, ?, ?)
  `).run(
    rentalId, pId, quote?.id || null, quote?.version || 1, name, maskPhone(phone || ''), project.product || '창호',
    months, monthly, totalFee, project.owner_name || '미배정', signature || name, nowKst, nowKst
  );

  const inserted = db.prepare('SELECT * FROM rental_applications WHERE id = ?').get(rentalId);
  hydrateLegacyRentalApplication(inserted);

  db.prepare(`
    UPDATE projects
    SET status = CASE
          WHEN status IN ('신규접수', '상담중', '가견적요청', '견적안내', '실측예정', '실측완료', '최종견적') THEN '계약진행'
          ELSE status
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(pId);

  recordAuditLog({
    projectId: pId,
    action: '렌탈 접수',
    detail: `렌탈 신청 ${rentalId}: ${name} (${plan}, 월 ${monthly.toLocaleString()}원)`,
    req
  });

  res.status(201).json({ id: rentalId, monthly, total: totalFee, status: '접수완료', createdAt: toKstIso(nowKst) });
});

// 4. Update Rental Status & Review Note (CRM Backward Compatibility + Sync)
router.patch('/:id/status', requireAuth, checkPartnerAccess, (req, res) => {
  const rentalId = req.params.id;
  const { status, review } = req.body;

  const app = db.prepare(`
    SELECT r.*, p.org_id
    FROM rental_applications r
    JOIN projects p ON r.project_id = p.id
    WHERE r.id = ?
  `).get(rentalId);

  if (!app) return res.status(404).json({ error: '렌탈 신청을 찾을 수 없습니다.' });
  if (req.partnerOrgId && app.org_id !== req.partnerOrgId) {
    return res.status(403).json({ error: '접근 권한이 없습니다.' });
  }

  const prevCode = normalizeStatusCode(app.status_code || app.status);
  const nextCode = status ? normalizeStatusCode(status) : prevCode;
  const nextKr = STATUS_CODE_TO_KR[nextCode] || status || app.status;

  db.prepare(`
    UPDATE rental_applications
    SET status = ?, status_code = ?, revision = COALESCE(revision, 1) + 1,
        review_note = COALESCE(?, review_note), updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(nextKr, nextCode, review !== undefined ? review : null, rentalId);

  db.prepare(`
    INSERT INTO rental_audit_events (
      application_id, actor_id, actor_name, actor_role, action, reason, previous_state, new_state, ip_masked
    ) VALUES (?, ?, ?, ?, '상태/심사메모 변경', ?, ?, ?, ?)
  `).run(
    rentalId,
    req.user.id,
    req.user.name,
    req.user.role,
    review || STATUS_LABELS[nextCode] || nextKr,
    prevCode,
    nextCode,
    maskIp(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
  );

  recordAuditLog({
    projectId: app.project_id,
    action: '렌탈 상태 변경',
    detail: `렌탈 ${rentalId} 상태: ${STATUS_LABELS[nextCode] || nextKr} (심사메모: ${review || ''})`,
    req
  });

  res.json({ success: true, status: status || app.status, statusCode: nextCode });
});

export default router;
