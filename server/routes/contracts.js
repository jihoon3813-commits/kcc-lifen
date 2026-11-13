import express from 'express';
import { db, hydrateLegacyRentalApplication } from '../db/index.js';
import { requireAuth, checkPartnerAccess } from '../middleware/auth.js';
import { recordAuditLog } from '../middleware/audit.js';
import { maskPhone } from '../utils/mobileQuoteFormatter.js';
import { notifyNewContract } from '../../api/_lib/discordHelper.js';

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

// 1. Get Contracts List
router.get('/', requireAuth, checkPartnerAccess, (req, res) => {
  const { status, type } = req.query;

  let sql = `
    SELECT
      c.*,
      p.product, p.partner_name, p.status as project_status,
      cust.name as customer_name, cust.phone as customer_phone,
      ra.id as rental_app_id,
      ra.plan_title as rental_plan_title,
      ra.period_months as rental_period_months,
      ra.monthly_fee as rental_monthly_fee,
      ra.total_fee as rental_total_fee,
      ra.upfront_fee as rental_upfront_fee,
      ra.status as rental_status,
      ra.status_code as rental_status_code
    FROM contracts c
    JOIN projects p ON c.project_id = p.id
    JOIN customers cust ON p.customer_id = cust.id
    LEFT JOIN rental_applications ra ON ra.id = (
      SELECT id FROM rental_applications
      WHERE (contract_reference = c.id OR (c.type = '렌탈' AND project_id = c.project_id))
        AND status NOT IN ('반려', '부결')
      ORDER BY CASE WHEN contract_reference = c.id THEN 0 ELSE 1 END, created_at DESC
      LIMIT 1
    )
    WHERE 1=1
  `;
  const params = [];

  if (req.partnerOrgId) {
    sql += ' AND p.org_id = ?';
    params.push(req.partnerOrgId);
  }

  if (status && status !== 'all') {
    sql += ' AND c.status = ?';
    params.push(status);
  }

  if (type && type !== 'all') {
    sql += ' AND c.type LIKE ?';
    params.push(`%${type}%`);
  }

  sql += ' ORDER BY c.created_at DESC';

  const rows = db.prepare(sql).all(...params);

  const contracts = rows.map(r => {
    const isRental = r.type === '렌탈';
    const rentalMonths = r.rental_period_months || (isRental ? 60 : null);
    const rentalMonthly = r.rental_monthly_fee || (isRental && r.amount ? Math.round((r.amount * 1.2) / (rentalMonths || 60) / 1000) * 1000 : null);
    const rentalTotal = r.rental_total_fee || (isRental && rentalMonthly ? rentalMonthly * (rentalMonths || 60) : (isRental ? r.amount : null));
    const rentalUpfront = r.rental_upfront_fee || 0;

    return {
      id: r.id,
      cid: r.project_id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      partner: r.partner_name,
      product: r.product,
      type: r.type,
      amount: r.amount,
      deposit: r.deposit_amount,
      balance: r.balance_amount,
      paid: r.paid_amount,
      status: r.status,
      note: r.note || '',
      date: String(r.created_at || '').slice(0, 10),
      createdAt: toKstIso(r.created_at),
      updatedAt: toKstIso(r.updated_at || r.created_at),
      createdAtText: String(r.created_at || '').slice(0, 16),
      quoteId: r.quote_id,
      quoteVersion: r.quote_version,
      rentalAppId: r.rental_app_id || null,
      rentalPlanTitle: r.rental_plan_title || (isRental ? '60개월 렌탈' : null),
      rentalPeriodMonths: rentalMonths,
      rentalMonthlyFee: rentalMonthly,
      rentalTotalFee: rentalTotal,
      rentalUpfrontFee: rentalUpfront,
      rentalStatus: r.rental_status || null,
      rentalStatusCode: r.rental_status_code || null
    };
  });

  res.json({ contracts });
});

// 2. Get Single Contract Detail
router.get('/:id', requireAuth, checkPartnerAccess, (req, res) => {
  const contract = db.prepare(`
    SELECT c.*, p.product, p.partner_name, p.org_id,
           cust.name as customer_name, cust.phone as customer_phone, cust.address as customer_address,
           q.title as quote_title, q.version as quote_version
    FROM contracts c
    JOIN projects p ON c.project_id = p.id
    JOIN customers cust ON p.customer_id = cust.id
    LEFT JOIN quotes q ON c.quote_id = q.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!contract) {
    return res.status(404).json({ error: '계약 정보를 찾을 수 없습니다.' });
  }
  if (req.partnerOrgId && contract.org_id !== req.partnerOrgId) {
    return res.status(403).json({ error: '접근 권한이 없습니다.' });
  }

  const rentalApplication = db.prepare(`
    SELECT * FROM rental_applications
    WHERE (contract_reference = ? OR (? = '렌탈' AND project_id = ?))
      AND status NOT IN ('반려', '부결')
    ORDER BY CASE WHEN contract_reference = ? THEN 0 ELSE 1 END, created_at DESC
    LIMIT 1
  `).get(contract.id, contract.type, contract.project_id, contract.id) || null;

  const receipts = db.prepare(`
    SELECT * FROM cash_receipts WHERE contract_id = ? ORDER BY paid_date ASC
  `).all(contract.id);

  const paymentOrders = db.prepare(`
    SELECT * FROM payment_orders WHERE contract_id = ? ORDER BY created_at DESC
  `).all(contract.id);

  res.json({
    contract,
    rentalApplication,
    receipts,
    paymentOrders
  });
});

// 3. Create Contract (Bound to specific quote version or direct amount)
router.post('/', requireAuth, checkPartnerAccess, (req, res) => {
  const { projectId, quoteId, type = '일시불(현금)', title, amount, depositAmount, balanceAmount, status, note, createRentalApp } = req.body;

  const pId = parseInt(projectId, 10);
  const project = db.prepare(`
    SELECT p.id, p.org_id, p.title, p.product, p.owner_name,
           c.name as customer_name, c.phone as customer_phone
    FROM projects p
    JOIN customers c ON p.customer_id = c.id
    WHERE p.id = ?
  `).get(pId);
  if (!project) {
    return res.status(404).json({ error: '공사건을 찾을 수 없습니다.' });
  }
  if (req.partnerOrgId && project.org_id !== req.partnerOrgId) {
    return res.status(403).json({ error: '접근 권한이 없습니다.' });
  }

  // Bind to specific quote if provided
  let quote = null;
  if (quoteId) {
    quote = db.prepare('SELECT id, version, total_price FROM quotes WHERE id = ?').get(quoteId);
  } else {
    // Pick latest published quote
    quote = db.prepare("SELECT id, version, total_price FROM quotes WHERE project_id = ? AND status = 'published' ORDER BY version DESC LIMIT 1").get(pId);
  }

  const hasExplicitAmount = amount !== undefined && amount !== null && String(amount).trim() !== '';
  const parsedAmount = hasExplicitAmount ? Math.max(0, parseInt(String(amount).replace(/[^\d-]/g, ''), 10) || 0) : null;
  const contractAmount = parsedAmount !== null ? parsedAmount : (quote ? quote.total_price : 0);
  const deposit = depositAmount !== undefined ? parseInt(depositAmount, 10) : (type === '렌탈' ? 0 : Math.round(contractAmount * 0.3));
  const balance = balanceAmount !== undefined ? parseInt(balanceAmount, 10) : (contractAmount - deposit);
  const initialStatus = (status && String(status).trim()) ? String(status).trim() : (type === '렌탈' ? '약정대기' : '계약체결');

  const nowKst = nowKstSql();
  const todayStr = nowKst.slice(2, 10).replace(/-/g, '');
  const countRow = db.prepare("SELECT COUNT(*) as cnt FROM contracts WHERE id LIKE ?").get(`C-${todayStr}%`);
  let seqNum = (countRow?.cnt || 0) + 1;
  let contractId = `C-${todayStr}-${String(seqNum).padStart(3, '0')}`;
  while (db.prepare('SELECT id FROM contracts WHERE id = ?').get(contractId)) {
    seqNum += 1;
    contractId = `C-${todayStr}-${String(seqNum).padStart(3, '0')}`;
  }

  const contractTitle = title || `${project.title || '고객'} 시공 계약서`;

  db.prepare(`
    INSERT INTO contracts (
      id, project_id, quote_id, quote_version, title, type, amount,
      deposit_amount, balance_amount, paid_amount, status, note, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
  `).run(
    contractId, pId, quote?.id || null, quote?.version || null,
    contractTitle, type, contractAmount, deposit, balance, initialStatus, note || '', nowKst, nowKst
  );

  // If rental contract is registered and no active rental application exists yet, auto-register rental application
  let rentalApplicationId = null;
  if (type === '렌탈' && createRentalApp !== false) {
    const existingApp = db.prepare(
      "SELECT id FROM rental_applications WHERE project_id = ? AND status NOT IN ('반려', '부결')"
    ).get(pId);
    if (!existingApp) {
      const rCountRow = db.prepare("SELECT COUNT(*) as cnt FROM rental_applications WHERE id LIKE ?").get(`R-${todayStr}%`);
      let rSeq = (rCountRow?.cnt || 0) + 1;
      let rId = `R-${todayStr}-${String(rSeq).padStart(3, '0')}`;
      while (db.prepare('SELECT id FROM rental_applications WHERE id = ?').get(rId)) {
        rSeq += 1;
        rId = `R-${todayStr}-${String(rSeq).padStart(3, '0')}`;
      }
      const basePrice = contractAmount > 0 ? contractAmount : 10000000;
      const months = 60;
      const monthly = Math.round((basePrice * 1.2) / months / 1000) * 1000;
      const totalFee = monthly * months;
      db.prepare(`
        INSERT INTO rental_applications (
          id, project_id, quote_id, quote_version, customer_name, customer_phone, product_name,
          period_months, monthly_fee, total_fee, status, status_code, assigned_to, doc_signature, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '접수완료', 'received', ?, ?, ?, ?)
      `).run(
        rId, pId, quote?.id || null, quote?.version || 1,
        project.customer_name, maskPhone(project.customer_phone || ''), project.product || '창호',
        months, monthly, totalFee, project.owner_name || '미배정', project.customer_name, nowKst, nowKst
      );
      const insertedRental = db.prepare('SELECT * FROM rental_applications WHERE id = ?').get(rId);
      hydrateLegacyRentalApplication(insertedRental);
      rentalApplicationId = rId;
    }
  }

  // Update project status to '계약진행'
  db.prepare("UPDATE projects SET status = '계약진행', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(pId);

  recordAuditLog({
    projectId: pId,
    action: '계약 체결',
    detail: `계약 번호 ${contractId} 등록 (${type}, 상태: ${initialStatus}, 금액 ${contractAmount.toLocaleString()}원${quote ? `, 견적 v${quote.version} 바인딩` : ''}) · 고객 상태 [계약진행] 자동 변경`,
    req
  });

  notifyNewContract({
    category: '신규 계약 등록',
    contractNo: contractId,
    customerName: project.customer_name,
    phone: project.customer_phone,
    contractType: type,
    status: initialStatus,
    totalAmount: contractAmount,
    depositAmount: deposit,
    balanceAmount: balance,
    product: project.product || '창호',
    contractDate: nowKst.slice(0, 10),
    summary: note || '',
  }).catch(() => {});

  res.status(201).json({
    id: contractId,
    contractId,
    rentalApplicationId,
    status: initialStatus,
    projectStatus: '계약진행',
    amount: contractAmount,
    deposit,
    balance,
    createdAt: toKstIso(nowKst),
    message: '계약이 성공적으로 등록되었습니다.'
  });
});

// 3b. Update Contract Status / Type / Note
router.patch('/:id', requireAuth, checkPartnerAccess, (req, res) => {
  const contractId = req.params.id;
  const contract = db.prepare(`
    SELECT c.*, p.org_id
    FROM contracts c
    JOIN projects p ON c.project_id = p.id
    WHERE c.id = ?
  `).get(contractId);

  if (!contract) {
    return res.status(404).json({ error: '계약을 찾을 수 없습니다.' });
  }
  if (req.partnerOrgId && contract.org_id !== req.partnerOrgId) {
    return res.status(403).json({ error: '접근 권한이 없습니다.' });
  }

  const { status, type, note, quoteTotal, totalAmount, amount } = req.body || {};
  const updates = [];
  const params = [];
  const logParts = [];

  const nextAmtRaw = quoteTotal ?? totalAmount ?? amount;
  if (nextAmtRaw !== undefined && Number(nextAmtRaw) >= 0 && Number(nextAmtRaw) !== Number(contract.amount)) {
    const cleanAmt = Math.round(Number(nextAmtRaw));
    updates.push('amount = ?');
    params.push(cleanAmt);
    logParts.push(`계약금액 변경: ${Number(contract.amount || 0).toLocaleString()}원 → ${cleanAmt.toLocaleString()}원`);
  }

  if (status !== undefined && String(status).trim() && String(status).trim() !== contract.status) {
    const cleanStatus = String(status).trim();
    updates.push('status = ?');
    params.push(cleanStatus);
    logParts.push(`계약·수납 상태 변경: ${contract.status} → ${cleanStatus}`);
  }
  if (type !== undefined && String(type).trim() && String(type).trim() !== contract.type) {
    const cleanType = String(type).trim();
    updates.push('type = ?');
    params.push(cleanType);
    logParts.push(`결제방식 변경: ${contract.type} → ${cleanType}`);
  }
  if (note !== undefined && String(note) !== String(contract.note || '')) {
    updates.push('note = ?');
    params.push(String(note));
    logParts.push('계약 메모 수정');
  }

  if (updates.length > 0) {
    updates.push('updated_at = ?');
    params.push(nowKstSql());
    params.push(contractId);
    db.prepare(`UPDATE contracts SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    if (logParts.length > 0) {
      recordAuditLog({
        projectId: contract.project_id,
        action: '계약 정보 수정',
        detail: `${contractId} · ${logParts.join(' / ')}`,
        req
      });
    }
  }

  const updated = db.prepare('SELECT * FROM contracts WHERE id = ?').get(contractId);
  res.json({
    success: true,
    status: updated.status,
    type: updated.type,
    note: updated.note || '',
    message: '계약 정보가 저장되었습니다.'
  });
});

// 4. Record Cash Receipt (선금/잔금 수납 원장)
router.post('/:id/cash-receipts', requireAuth, checkPartnerAccess, (req, res) => {
  const contractId = req.params.id;
  const { receiptType, amount, paidDate, note } = req.body;

  const contract = db.prepare(`
    SELECT c.*, p.org_id
    FROM contracts c
    JOIN projects p ON c.project_id = p.id
    WHERE c.id = ?
  `).get(contractId);

  if (!contract) {
    return res.status(404).json({ error: '계약을 찾을 수 없습니다.' });
  }
  if (req.partnerOrgId && contract.org_id !== req.partnerOrgId) {
    return res.status(403).json({ error: '접근 권한이 없습니다.' });
  }

  const payAmt = parseInt(amount, 10);
  if (!payAmt || payAmt <= 0) {
    return res.status(400).json({ error: '유효한 수납 금액을 입력해 주세요.' });
  }

  const receiptNo = `RCP-${Date.now().toString().slice(-8)}`;
  const dateStr = paidDate || new Date().toISOString().slice(0, 10);

  db.prepare(`
    INSERT INTO cash_receipts (contract_id, receipt_type, amount, receipt_no, paid_date, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(contractId, receiptType || 'deposit', payAmt, receiptNo, dateStr, note || '');

  // Update Contract Paid Amount & Status
  const newPaidAmount = contract.paid_amount + payAmt;
  let newStatus = contract.status;
  if (newPaidAmount >= contract.amount) {
    newStatus = '수납완료';
    db.prepare("UPDATE projects SET status = '계약완료', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(contract.project_id);
  } else if (newPaidAmount > 0) {
    newStatus = '선금완료';
  }

  db.prepare(`
    UPDATE contracts
    SET paid_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newPaidAmount, newStatus, contractId);

  recordAuditLog({
    projectId: contract.project_id,
    action: '현금 수납',
    detail: `수납 기록: ${payAmt.toLocaleString()}원 (${receiptType === 'balance' ? '잔금' : '선금'}), 영수증: ${receiptNo}`,
    req
  });

  res.json({
    success: true,
    paid_amount: newPaidAmount,
    status: newStatus,
    receipt_no: receiptNo
  });
});

// 5. PG Order & Approval Interface (카드 결제)
router.post('/:id/pg-order', requireAuth, checkPartnerAccess, (req, res) => {
  const contractId = req.params.id;
  const { amount } = req.body;

  const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(contractId);
  if (!contract) return res.status(404).json({ error: '계약을 찾을 수 없습니다.' });

  const orderNo = `PG_ORD_${Date.now()}`;
  const payAmt = parseInt(amount, 10) || (contract.amount - contract.paid_amount);

  db.prepare(`
    INSERT INTO payment_orders (contract_id, order_no, amount, status, pg_provider)
    VALUES (?, ?, ?, 'pending', 'kcc_pay')
  `).run(contractId, orderNo, payAmt);

  res.json({
    order_no: orderNo,
    amount: payAmt,
    checkout_url: `/api/contracts/${contractId}/pg-mock-checkout?order_no=${orderNo}`
  });
});

// 6. Card Payment Approval / Mock Checkout
router.post('/:id/pg-approve', requireAuth, checkPartnerAccess, (req, res) => {
  const contractId = req.params.id;
  const { orderNo, cardName = '현대카드', cardQuota = 0 } = req.body;

  const order = db.prepare('SELECT * FROM payment_orders WHERE order_no = ?').get(orderNo);
  if (!order) return res.status(404).json({ error: '결제 주문을 찾을 수 없습니다.' });

  const tid = `TID_${Date.now()}`;
  db.prepare(`
    UPDATE payment_orders
    SET status = 'completed', pg_tid = ?, card_name = ?, card_quota = ?, approved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(tid, cardName, cardQuota, order.id);

  const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(contractId);
  const newPaid = contract.paid_amount + order.amount;
  const newStatus = newPaid >= contract.amount ? '수납완료' : '선금완료';

  db.prepare("UPDATE contracts SET paid_amount = ?, status = ?, type = '카드할부', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(newPaid, newStatus, contractId);

  recordAuditLog({
    projectId: contract.project_id,
    action: '카드 승인',
    detail: `PG 카드 수납 완료: ${order.amount.toLocaleString()}원 (${cardName} ${cardQuota ? cardQuota + '개월' : '일시불'}), 승인번호: ${tid}`,
    req
  });

  res.json({ success: true, tid, status: newStatus });
});

export default router;
