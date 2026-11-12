import express from 'express';
import { db } from '../db/index.js';
import { requireAuth, checkPartnerAccess } from '../middleware/auth.js';
import { recordAuditLog } from '../middleware/audit.js';

const router = express.Router();

// 1. Get Contracts List
router.get('/', requireAuth, checkPartnerAccess, (req, res) => {
  const { status, type } = req.query;

  let sql = `
    SELECT
      c.*,
      p.product, p.partner_name, p.status as project_status,
      cust.name as customer_name, cust.phone as customer_phone
    FROM contracts c
    JOIN projects p ON c.project_id = p.id
    JOIN customers cust ON p.customer_id = cust.id
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

  const contracts = rows.map(r => ({
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
    date: r.created_at.slice(0, 10),
    quoteId: r.quote_id,
    quoteVersion: r.quote_version
  }));

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

  const receipts = db.prepare(`
    SELECT * FROM cash_receipts WHERE contract_id = ? ORDER BY paid_date ASC
  `).all(contract.id);

  const paymentOrders = db.prepare(`
    SELECT * FROM payment_orders WHERE contract_id = ? ORDER BY created_at DESC
  `).all(contract.id);

  res.json({
    contract,
    receipts,
    paymentOrders
  });
});

// 3. Create Contract (Bound to specific quote version)
router.post('/', requireAuth, checkPartnerAccess, (req, res) => {
  const { projectId, quoteId, type = '일시불(현금)', title, amount, depositAmount, balanceAmount, note } = req.body;

  const pId = parseInt(projectId, 10);
  const project = db.prepare('SELECT id, org_id, title FROM projects WHERE id = ?').get(pId);
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
    quote = db.prepare('SELECT id, version, total_price FROM quotes WHERE project_id = ? AND status = "published" ORDER BY version DESC LIMIT 1').get(pId);
  }

  const contractAmount = quote ? quote.total_price : (parseInt(amount, 10) || 0);
  const deposit = depositAmount !== undefined ? parseInt(depositAmount, 10) : Math.round(contractAmount * 0.3);
  const balance = balanceAmount !== undefined ? parseInt(balanceAmount, 10) : (contractAmount - deposit);

  // Generate Contract ID: C-YYMMDD-XXX
  const todayStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const countRow = db.prepare("SELECT COUNT(*) as cnt FROM contracts WHERE id LIKE ?").get(`C-${todayStr}%`);
  const seq = String((countRow?.cnt || 0) + 1).padStart(3, '0');
  const contractId = `C-${todayStr}-${seq}`;

  const contractTitle = title || `${project.title || '고객'} 시공 계약서`;

  db.prepare(`
    INSERT INTO contracts (
      id, project_id, quote_id, quote_version, title, type, amount,
      deposit_amount, balance_amount, paid_amount, status, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '계약체결', ?)
  `).run(
    contractId, pId, quote?.id || null, quote?.version || null,
    contractTitle, type, contractAmount, deposit, balance, note || ''
  );

  // Update project status to '계약진행'
  db.prepare("UPDATE projects SET status = '계약진행', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(pId);

  recordAuditLog({
    projectId: pId,
    action: '계약 체결',
    detail: `계약 번호 ${contractId} 등록 (${type}, 금액 ${contractAmount.toLocaleString()}원${quote ? `, 견적 v${quote.version} 바인딩` : ''})`,
    req
  });

  res.status(201).json({
    id: contractId,
    amount: contractAmount,
    deposit,
    balance,
    message: '계약이 성공적으로 등록되었습니다.'
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

  db.prepare('UPDATE contracts SET paid_amount = ?, status = ?, type = "카드할부", updated_at = CURRENT_TIMESTAMP WHERE id = ?')
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
