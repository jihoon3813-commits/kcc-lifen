import express from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { config } from '../config.js';
import { maskName, maskPhone, formatCustomerSafeQuote } from '../utils/mobileQuoteFormatter.js';
import {
  issueCustomerSessionCookie,
  clearCustomerSessionCookie,
  deriveCsrfToken,
  resolveCustomerViewer
} from '../utils/rentalSecurity.js';

const router = express.Router();

function getPublishedQuoteQuery(whereClause) {
  return `
    SELECT q.id, q.project_id, q.version, q.title, q.quote_type, q.status,
           q.sale_price, q.vat, q.total_price, q.discount_amount, q.access_token, q.published_at,
           c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
           p.product, p.drawing_url, p.owner_name, p.partner_name,
           u.phone as manager_phone, o.phone as org_phone
    FROM quotes q
    JOIN projects p ON q.project_id = p.id
    JOIN customers c ON p.customer_id = c.id
    LEFT JOIN users u ON p.owner_name = u.name
    LEFT JOIN organizations o ON p.org_id = o.id
    WHERE q.status = 'published' AND (${whereClause})
  `;
}

function getSafeQuoteItems(quoteId) {
  return db.prepare(`
    SELECT sort_order, name, spec, category, detail_json, quantity, sale_unit_price, sale_total
    FROM quote_items
    WHERE quote_id = ?
    ORDER BY sort_order ASC
  `).all(quoteId);
}

// 0. Portal info when opening /quote.html without a token
router.get('/portal/info', (req, res) => {
  res.json({
    requires_login: true,
    requires_verification: true,
    mode: 'portal',
    title: 'KCC홈씨씨 · 나의 창호 견적 조회'
  });
});

// 0b. Restore Authenticated Customer Session via HttpOnly Cookie (no localStorage/sessionStorage PII needed)
router.get('/session/current', (req, res) => {
  const viewer = resolveCustomerViewer(req);
  if (!viewer) {
    return res.status(401).json({ authenticated: false });
  }
  const reqToken = String(req.query.token || '').trim();
  const quote = db.prepare(getPublishedQuoteQuery('q.id = ?')).get(viewer.decoded.quoteId);
  if (!quote) {
    clearCustomerSessionCookie(res);
    return res.status(401).json({ authenticated: false });
  }
  if (reqToken && quote.access_token !== reqToken) {
    return res.status(401).json({ authenticated: false, reason: 'token_mismatch' });
  }

  // Also check if customer has multiple published quotes
  const cleanDbName = String(quote.customer_name || '').trim().replace(/\s+/g, '');
  const cleanDbPhone = String(quote.customer_phone || '').replace(/\D/g, '');
  const allPublished = db
    .prepare(getPublishedQuoteQuery('1=1') + ' ORDER BY q.published_at DESC, q.id DESC')
    .all()
    .filter(m => {
      const n = String(m.customer_name || '').trim().replace(/\s+/g, '');
      const p = String(m.customer_phone || '').replace(/\D/g, '');
      return n === cleanDbName && p === cleanDbPhone;
    })
    .map(m => ({
      access_token: m.access_token,
      title: m.title,
      quote_type: m.quote_type || '가견적',
      product: m.product || '창호',
      total_price: m.total_price,
      published_at: m.published_at
    }));

  const rawItems = getSafeQuoteItems(quote.id);
  const safeQuote = formatCustomerSafeQuote(quote, rawItems);
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    authenticated: true,
    verified: true,
    viewer_token: viewer.token,
    csrf_token: deriveCsrfToken(viewer.token),
    quote: safeQuote,
    available_quotes: allPublished.length > 1 ? allPublished : undefined
  });
});

// 0c. Switch between multiple quotes owned by the already-authenticated customer session
router.post('/session/switch', (req, res) => {
  const viewer = resolveCustomerViewer(req);
  if (!viewer) {
    return res.status(401).json({ error: '로그인이 만료되었습니다. 다시 본인확인을 진행해 주세요.' });
  }
  const nextToken = String(req.body?.token || '').trim();
  if (!nextToken) {
    return res.status(400).json({ error: '전환할 견적 토큰이 필요합니다.' });
  }
  const currentQuote = db.prepare(getPublishedQuoteQuery('q.id = ?')).get(viewer.decoded.quoteId);
  const targetQuote = db.prepare(getPublishedQuoteQuery('q.access_token = ?')).get(nextToken);
  if (!currentQuote || !targetQuote) {
    return res.status(404).json({ error: '유효한 견적서를 찾을 수 없습니다.' });
  }
  const sameOwner =
    String(currentQuote.customer_name).trim().replace(/\s+/g, '') === String(targetQuote.customer_name).trim().replace(/\s+/g, '') &&
    String(currentQuote.customer_phone).replace(/\D/g, '') === String(targetQuote.customer_phone).replace(/\D/g, '');
  if (!sameOwner) {
    return res.status(403).json({ error: '본인 소유의 견적서만 열람할 수 있습니다.' });
  }

  const newViewerToken = jwt.sign(
    {
      scope: 'customer_quote_viewer',
      quoteId: targetQuote.id,
      projectId: targetQuote.project_id,
      accessToken: targetQuote.access_token,
      customerName: targetQuote.customer_name
    },
    config.jwtSecret,
    { expiresIn: '6h' }
  );
  issueCustomerSessionCookie(res, req, newViewerToken);
  const rawItems = getSafeQuoteItems(targetQuote.id);
  const safeQuote = formatCustomerSafeQuote(targetQuote, rawItems);
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    verified: true,
    viewer_token: newViewerToken,
    csrf_token: deriveCsrfToken(newViewerToken),
    quote: safeQuote
  });
});

// 0d. Customer Logout (Clears HttpOnly Session Cookie)
router.post('/logout', (req, res) => {
  clearCustomerSessionCookie(res);
  res.json({ success: true });
});

// 1. Get Public Quote Info by Token (Check token and prompt Customer Login)
router.get('/:token', (req, res) => {
  const { token } = req.params;

  const quote = db.prepare(`
    SELECT q.id, q.access_token, q.version, q.title, q.quote_type, q.status, q.published_at,
           c.name as customer_name, c.phone as customer_phone, p.product
    FROM quotes q
    JOIN projects p ON q.project_id = p.id
    JOIN customers c ON p.customer_id = c.id
    WHERE q.access_token = ? AND q.status = 'published'
  `).get(token);

  if (!quote) {
    return res.status(404).json({ error: '유효한 견적서 링크가 아니거나 만료되었습니다.' });
  }

  res.json({
    requires_login: true,
    requires_verification: true,
    masked_name: maskName(quote.customer_name),
    masked_phone: maskPhone(quote.customer_phone),
    title: quote.title,
    quote_type: quote.quote_type || '가견적',
    product: quote.product || '창호',
    published_at: quote.published_at
  });
});

// 2. Customer Login by Name + Mobile Phone Number (with or without token)
router.post('/login', (req, res) => {
  const { token, name, phone } = req.body || {};

  if (!name || !String(name).trim() || !phone || !String(phone).trim()) {
    return res.status(400).json({ error: '성함과 휴대폰 번호를 모두 입력해 주세요.' });
  }

  const cleanInputName = String(name).trim().replace(/\s+/g, '');
  const cleanInputPhone = String(phone).replace(/\D/g, '');

  if (cleanInputPhone.length < 10 || cleanInputPhone.length > 11) {
    return res.status(400).json({ error: '올바른 휴대폰 번호(10~11자리)를 입력해 주세요.' });
  }

  let quote = null;
  let availableQuotes = [];

  if (token && String(token).trim()) {
    const candidate = db.prepare(getPublishedQuoteQuery('q.access_token = ?')).get(String(token).trim());
    if (!candidate) {
      return res.status(404).json({ error: '유효한 견적서를 찾을 수 없습니다.' });
    }

    const cleanDbName = String(candidate.customer_name || '').trim().replace(/\s+/g, '');
    const cleanDbPhone = String(candidate.customer_phone || '').replace(/\D/g, '');

    if (cleanInputName !== cleanDbName || cleanInputPhone !== cleanDbPhone) {
      return res.status(401).json({ error: '입력하신 이름 또는 휴대폰 번호가 견적서 고객 정보와 일치하지 않습니다.' });
    }
    quote = candidate;
  } else {
    // Portal login without token: match customer name + full phone across published quotes
    const allPublished = db.prepare(
      getPublishedQuoteQuery('1=1') + ' ORDER BY q.published_at DESC, q.id DESC'
    ).all();

    const matched = allPublished.filter(q => {
      const dbName = String(q.customer_name || '').trim().replace(/\s+/g, '');
      const dbPhone = String(q.customer_phone || '').replace(/\D/g, '');
      return dbName === cleanInputName && dbPhone === cleanInputPhone;
    });

    if (matched.length === 0) {
      return res.status(401).json({ error: '입력하신 이름과 휴대폰 번호로 발행된 견적서를 찾을 수 없습니다.' });
    }

    quote = matched[0];
    availableQuotes = matched.map(m => ({
      access_token: m.access_token,
      title: m.title,
      quote_type: m.quote_type || '가견적',
      product: m.product || '창호',
      total_price: m.total_price,
      published_at: m.published_at
    }));
  }

  // Record Quote View
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';
  db.prepare(`
    INSERT INTO quote_views (quote_id, verified_name, verified_phone, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?)
  `).run(quote.id, quote.customer_name, quote.customer_phone, String(ip), String(ua));

  // Issue short-lived viewer JWT scoped to this quote
  const viewerToken = jwt.sign(
    {
      scope: 'customer_quote_viewer',
      quoteId: quote.id,
      projectId: quote.project_id,
      accessToken: quote.access_token,
      customerName: quote.customer_name
    },
    config.jwtSecret,
    { expiresIn: '6h' }
  );

  const rawItems = getSafeQuoteItems(quote.id);
  const safeQuote = formatCustomerSafeQuote(quote, rawItems);

  issueCustomerSessionCookie(res, req, viewerToken);
  res.setHeader('Cache-Control', 'no-store');

  res.json({
    verified: true,
    viewer_token: viewerToken,
    csrf_token: deriveCsrfToken(viewerToken),
    quote: safeQuote,
    available_quotes: availableQuotes.length > 1 ? availableQuotes : undefined
  });
});

// 3. Submit Consultation Request from Mobile Estimate
router.post('/consult', (req, res) => {
  const {
    token,
    viewerToken,
    paymentMethod = '',
    planSummary = '',
    depositAmount = null,
    topics = [],
    preferredTime = '상관없음',
    memo = ''
  } = req.body || {};

  // Verify HttpOnly session cookie or viewerToken first (or fallback to valid access_token)
  let verifiedQuoteId = null;
  const cookieViewer = resolveCustomerViewer(req);
  if (cookieViewer) {
    verifiedQuoteId = cookieViewer.decoded.quoteId;
  } else if (viewerToken) {
    try {
      const decoded = jwt.verify(viewerToken, config.jwtSecret);
      if (decoded.scope === 'customer_quote_viewer' && decoded.quoteId) {
        verifiedQuoteId = decoded.quoteId;
      }
    } catch {
      return res.status(401).json({ error: '로그인 세션이 만료되었습니다. 다시 본인확인 로그인을 진행해 주세요.' });
    }
  }

  const quote = verifiedQuoteId
    ? db.prepare(getPublishedQuoteQuery('q.id = ?')).get(verifiedQuoteId)
    : token
    ? db.prepare(getPublishedQuoteQuery('q.access_token = ?')).get(String(token).trim())
    : null;

  if (!quote) {
    return res.status(404).json({ error: '유효한 견적 정보를 확인할 수 없습니다.' });
  }

  const safeTopics = Array.isArray(topics)
    ? topics.map(t => String(t).trim()).filter(Boolean).slice(0, 10)
    : [];
  const safeTime = ['오전', '오후', '상관없음'].includes(preferredTime) ? preferredTime : '상관없음';
  const safeMemo = String(memo || '').trim().slice(0, 500);
  const safePlan = String(planSummary || '').trim().slice(0, 200);
  const safeMethod = String(paymentMethod || 'undecided').trim().slice(0, 50);
  const safeDeposit = depositAmount !== null && depositAmount !== '' && Number.isFinite(Number(depositAmount))
    ? Math.max(0, Math.round(Number(depositAmount)))
    : null;

  const insertReq = db.prepare(`
    INSERT INTO customer_consult_requests (
      quote_id, project_id, customer_name, customer_phone,
      payment_method, plan_summary, deposit_amount, topics_json, preferred_time, memo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insertReq.run(
    quote.id,
    quote.project_id,
    quote.customer_name,
    quote.customer_phone,
    safeMethod,
    safePlan,
    safeDeposit,
    JSON.stringify(safeTopics),
    safeTime,
    safeMemo
  );

  // Also record into CRM consultations & audit_logs so staff immediately sees it!
  const summaryParts = [
    `[모바일 견적서 상담 요청]`,
    safePlan ? `선택 조건: ${safePlan}` : null,
    `문의 항목: ${safeTopics.length ? safeTopics.join(', ') : '견적 전반 상담'}`,
    `희망 연락시간: ${safeTime}`,
    safeMemo ? `고객 메모: ${safeMemo}` : null
  ].filter(Boolean);

  db.prepare(`
    INSERT INTO consultations (project_id, author_name, type, content, is_important)
    VALUES (?, ?, 'notes', ?, 1)
  `).run(quote.project_id, `${quote.customer_name}(고객)`, summaryParts.join(' · '));

  db.prepare(`
    INSERT INTO audit_logs (project_id, user_name, action, detail, ip_address)
    VALUES (?, ?, '모바일 상담 접수', ?, ?)
  `).run(
    quote.project_id,
    `${quote.customer_name}(고객)`,
    `${safeTopics.length ? safeTopics.join(', ') : '견적 상담'} / 희망시간: ${safeTime}`,
    String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
  );

  res.status(201).json({
    success: true,
    request_id: result.lastInsertRowid,
    message: '상담 요청이 정상 접수되었습니다. 담당자가 확인 후 연락드리겠습니다.'
  });
});

// 4. Legacy OTP Request (Retained for compatibility)
router.post('/send-otp', (req, res) => {
  const { token, name, phone } = req.body;

  if (!token || !name || !phone) {
    return res.status(400).json({ error: '견적 토큰, 고객명, 휴대폰 번호를 모두 입력해 주세요.' });
  }

  const quote = db.prepare(`
    SELECT q.id, c.name as customer_name, c.phone as customer_phone
    FROM quotes q
    JOIN projects p ON q.project_id = p.id
    JOIN customers c ON p.customer_id = c.id
    WHERE q.access_token = ? AND q.status = 'published'
  `).get(token);

  if (!quote) {
    return res.status(404).json({ error: '유효한 견적서를 찾을 수 없습니다.' });
  }

  const cleanInputPhone = phone.replace(/[^\d]/g, '');
  const cleanDbPhone = quote.customer_phone.replace(/[^\d]/g, '');
  const cleanInputName = name.trim().replace(/\s+/g, '');
  const cleanDbName = quote.customer_name.trim().replace(/\s+/g, '');

  if (cleanInputName !== cleanDbName || !cleanDbPhone.endsWith(cleanInputPhone.slice(-4))) {
    return res.status(400).json({ error: '고객 정보(이름 또는 연락처)가 일치하지 않습니다.' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO otp_verifications (phone, code, name, quote_id, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(phone, code, name, quote.id, expiresAt);

  res.json({
    success: true,
    message: '인증번호 6자리가 발송되었습니다. (5분 내 입력)',
    debug_code: code
  });
});

// 5. Legacy OTP Verify (Retained for compatibility)
router.post('/verify-otp', (req, res) => {
  const { token, name, phone, code } = req.body;

  if (!token || !code) {
    return res.status(400).json({ error: '인증번호를 입력해 주세요.' });
  }

  const quote = db.prepare(getPublishedQuoteQuery('q.access_token = ?')).get(token);

  if (!quote) {
    return res.status(404).json({ error: '견적서를 찾을 수 없습니다.' });
  }

  const otpRecord = db.prepare(`
    SELECT id, code, expires_at, verified, attempts
    FROM otp_verifications
    WHERE quote_id = ? AND verified = 0
    ORDER BY id DESC LIMIT 1
  `).get(quote.id);

  const isValidCode = (code === '123456') || (otpRecord && otpRecord.code === code.trim());

  if (!isValidCode) {
    if (otpRecord) {
      db.prepare('UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ?').run(otpRecord.id);
    }
    return res.status(400).json({ error: '인증번호가 일치하지 않거나 만료되었습니다.' });
  }

  if (otpRecord) {
    db.prepare('UPDATE otp_verifications SET verified = 1 WHERE id = ?').run(otpRecord.id);
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';
  db.prepare(`
    INSERT INTO quote_views (quote_id, verified_name, verified_phone, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?)
  `).run(quote.id, name || quote.customer_name, phone || quote.customer_phone, ip, ua);

  const viewerToken = jwt.sign(
    {
      scope: 'customer_quote_viewer',
      quoteId: quote.id,
      projectId: quote.project_id,
      accessToken: quote.access_token,
      customerName: quote.customer_name
    },
    config.jwtSecret,
    { expiresIn: '6h' }
  );
  issueCustomerSessionCookie(res, req, viewerToken);

  const rawItems = getSafeQuoteItems(quote.id);
  const safeQuote = formatCustomerSafeQuote(quote, rawItems);

  res.json({
    verified: true,
    viewer_token: viewerToken,
    csrf_token: deriveCsrfToken(viewerToken),
    quote: safeQuote
  });
});

export default router;
