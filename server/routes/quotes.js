import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import { db } from '../db/index.js';
import { config } from '../config.js';
import { requireAuth, checkPartnerAccess } from '../middleware/auth.js';
import { recordAuditLog } from '../middleware/audit.js';
import { parseEstimateFile } from '../utils/excelParser.js';
import { calculateQuote } from '../utils/quoteCalc.js';
import { formatCustomerSafeQuote } from '../utils/mobileQuoteFormatter.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }
});

// Helper: Load messaging config from integration_configs
function getMessagingConfig() {
  try {
    const row = db.prepare("SELECT config_json FROM integration_configs WHERE key = 'messaging'").get();
    if (row?.config_json) return JSON.parse(row.config_json);
  } catch {}
  return {
    enabled: false,
    provider: 'simulation',
    senderPhone: process.env.SMS_SENDER_PHONE || '1588-0000',
    smsWebhookUrl: process.env.SMS_WEBHOOK_URL || '',
    kakaoWebhookUrl: process.env.KAKAO_WEBHOOK_URL || '',
    apiKey: process.env.MESSAGING_API_KEY || '',
    kakaoPfId: process.env.KAKAO_PF_ID || ''
  };
}

// 1. Upload & Parse KCC Estimate File (XLS / XLSX / CSV)
router.post('/parse-file', requireAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '업로드할 엑셀/CSV 파일을 선택해 주세요.' });
    }

    const { projectId } = req.body;
    const parsed = parseEstimateFile(req.file.buffer, req.file.originalname);

    if (projectId) {
      const pId = parseInt(projectId, 10);
      const ext = path.extname(req.file.originalname) || '.xlsx';
      const savedFilename = `kcc_quote_${pId}_${Date.now()}${ext}`;
      const savedPath = path.join(config.uploadsDir, 'quotes', savedFilename);
      fs.writeFileSync(savedPath, req.file.buffer);

      db.prepare(`
        INSERT INTO estimate_sources (
          project_id, filename, original_name, file_url, file_size, parsed_cost, items_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        pId, savedFilename, req.file.originalname, `/uploads/quotes/${savedFilename}`,
        req.file.size, parsed.total_cost, JSON.stringify(parsed.items)
      );

      recordAuditLog({
        projectId: pId,
        action: '견적 원본 등록',
        detail: `KCC 원본 파일 분석: ${req.file.originalname} (${parsed.item_count}개 품목, 원가 ${parsed.total_cost.toLocaleString()}원)`,
        req
      });
    }

    res.json({
      success: true,
      data: parsed
    });
  } catch (err) {
    console.error('File parse error:', err);
    res.status(400).json({ error: err.message || '파일 파싱에 실패했습니다.' });
  }
});

// 2. Create or Publish Quote
router.post('/', requireAuth, checkPartnerAccess, (req, res) => {
  const {
    projectId,
    title,
    quoteType = '가견적',
    items,
    marginRate = 20.0,
    discountAmount = 0,
    memo,
    isPublish = true
  } = req.body;

  if (!projectId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '공사건 ID와 견적 품목 목록이 필요합니다.' });
  }

  const pId = parseInt(projectId, 10);
  const project = db.prepare('SELECT id, org_id, customer_id, title FROM projects WHERE id = ?').get(pId);
  if (!project) {
    return res.status(404).json({ error: '공사건을 찾을 수 없습니다.' });
  }
  if (req.partnerOrgId && project.org_id !== req.partnerOrgId) {
    return res.status(403).json({ error: '접근 권한이 없습니다.' });
  }

  const calculated = calculateQuote(items, marginRate);
  const safeDiscount = Math.max(0, Math.round(Number(discountAmount) || 0));
  const safeType = ['가견적', '최종견적', '비교안'].includes(quoteType) ? quoteType : '가견적';

  const maxVerRow = db.prepare('SELECT MAX(version) as max_ver FROM quotes WHERE project_id = ?').get(pId);
  const nextVer = (maxVerRow?.max_ver || 0) + 1;

  const accessToken = `tok_${pId}_v${nextVer}_${crypto.randomBytes(8).toString('hex')}`;
  const status = isPublish ? 'published' : 'draft';
  const publishedAt = isPublish ? new Date().toISOString() : null;
  const quoteTitle = title || `${project.title || '고객'} 견적서 (v${nextVer})`;

  const insertQuote = db.prepare(`
    INSERT INTO quotes (
      project_id, version, title, quote_type, status, total_cost, margin_rate, sale_price,
      vat, total_price, discount_amount, memo, access_token, published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const quoteResult = insertQuote.run(
    pId, nextVer, quoteTitle, safeType, status, calculated.total_cost, calculated.margin_rate,
    calculated.sale_price, calculated.vat, calculated.total_price, safeDiscount, memo || '',
    accessToken, publishedAt
  );

  const quoteId = quoteResult.lastInsertRowid;

  const insertItem = db.prepare(`
    INSERT INTO quote_items (
      quote_id, sort_order, name, spec, category, detail_json, quantity, cost_unit_price, cost_total,
      sale_unit_price, sale_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of calculated.items) {
    insertItem.run(
      quoteId, item.sort_order, item.name, item.spec, item.category || 'window', item.detail_json || null,
      item.quantity, item.cost_unit_price, item.cost_total, item.sale_unit_price, item.sale_total
    );
  }

  const publicUrl = `/quote.html?token=${accessToken}`;

  if (isPublish) {
    const linkCol = safeType === '최종견적' ? 'final_quote_url' : 'rough_quote_url';
    db.prepare(`
      UPDATE projects
      SET status = CASE
            WHEN ? = '최종견적' AND status IN ('신규접수', '상담중', '가견적요청', '견적안내', '실측예정', '실측완료') THEN '최종견적'
            WHEN status IN ('신규접수', '가견적요청') THEN '견적안내'
            ELSE status
          END,
          ${linkCol} = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(safeType, publicUrl, pId);
  }

  recordAuditLog({
    projectId: pId,
    action: isPublish ? `${safeType} 발행` : '가견적 임시저장',
    detail: `견적 v${nextVer} (${quoteTitle}): 공급원가 ${calculated.total_cost.toLocaleString()}원, 마진율 ${calculated.margin_rate}%, 총 견적 ${calculated.total_price.toLocaleString()}원`,
    req
  });

  res.status(201).json({
    quote_id: quoteId,
    version: nextVer,
    quote_type: safeType,
    access_token: accessToken,
    public_url: publicUrl,
    summary: {
      total_cost: calculated.total_cost,
      margin_rate: calculated.margin_rate,
      sale_price: calculated.sale_price,
      vat: calculated.vat,
      total_price: calculated.total_price,
      discount_amount: safeDiscount
    }
  });
});

// 3. Preview Published Quote by Project ID (Supports 가견적 / 최종견적 / quoteId selection & Send Modal)
router.get('/by-project/:projectId/preview', requireAuth, checkPartnerAccess, (req, res) => {
  const projectId = parseInt(req.params.projectId, 10);
  const requestedType = req.query.type ? String(req.query.type).trim() : '';
  const requestedQuoteId = req.query.quoteId ? parseInt(req.query.quoteId, 10) : null;
  const allowSimulate = req.query.simulate !== '0';

  const allQuotes = db.prepare(`
    SELECT q.*, p.org_id, p.product, p.drawing_url, p.rough_quote_url, p.final_quote_url,
           p.owner_name, p.partner_name,
           c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
           u.phone as manager_phone, o.phone as org_phone
    FROM quotes q
    JOIN projects p ON q.project_id = p.id
    JOIN customers c ON p.customer_id = c.id
    LEFT JOIN users u ON p.owner_name = u.name
    LEFT JOIN organizations o ON p.org_id = o.id
    WHERE q.project_id = ? AND q.status = 'published'
    ORDER BY q.version DESC, q.id DESC
  `).all(projectId);

  if (!allQuotes.length) {
    return res.status(404).json({ error: '해당 고객에게 발행된 견적서가 없습니다. 먼저 견적을 발행해 주세요.' });
  }
  if (req.partnerOrgId && allQuotes[0].org_id !== req.partnerOrgId) {
    return res.status(403).json({ error: '접근 권한이 없습니다.' });
  }

  let quote = allQuotes[0];
  let isSimulatedType = false;

  if (requestedQuoteId) {
    const byId = allQuotes.find(q => q.id === requestedQuoteId);
    if (byId) quote = byId;
  } else if (requestedType) {
    const byType = allQuotes.find(q => (q.quote_type || '가견적') === requestedType);
    if (byType) {
      quote = byType;
    } else {
      isSimulatedType = true;
    }
  }

  const rawItems = db.prepare(`
    SELECT sort_order, name, spec, category, detail_json, quantity, sale_unit_price, sale_total
    FROM quote_items
    WHERE quote_id = ?
    ORDER BY sort_order ASC
  `).all(quote.id);

  const safeQuote = formatCustomerSafeQuote(quote, rawItems);
  if (isSimulatedType && allowSimulate && requestedType) {
    safeQuote.quote_type = requestedType;
    safeQuote.is_simulated_type = true;
  }

  const availableQuotes = allQuotes.map(q => ({
    id: q.id,
    version: q.version,
    title: q.title,
    quote_type: q.quote_type || '가견적',
    total_price: q.total_price,
    discount_amount: q.discount_amount || 0,
    access_token: q.access_token,
    public_url: `/quote.html?token=${q.access_token}`,
    published_at: String(q.published_at || q.created_at || '').slice(0, 10)
  }));

  const roughQuoteMeta = availableQuotes.find(q => q.quote_type === '가견적') || null;
  const finalQuoteMeta = availableQuotes.find(q => q.quote_type === '최종견적') || null;

  const dispatches = db.prepare(`
    SELECT id, quote_id, channel, recipient_name, recipient_phone, message, quote_url, provider, status, sent_by,
           strftime('%Y-%m-%d %H:%M', created_at, 'localtime') as sent_at
    FROM quote_dispatches
    WHERE project_id = ?
    ORDER BY id DESC
    LIMIT 20
  `).all(projectId);

  const viewsCount = db.prepare('SELECT COUNT(*) as cnt FROM quote_views WHERE quote_id = ?').get(quote.id)?.cnt || 0;
  const msgCfg = getMessagingConfig();

  res.json({
    quote: safeQuote,
    is_simulated_type: isSimulatedType,
    requested_type: requestedType || safeQuote.quote_type,
    available_quotes: availableQuotes,
    rough_quote: roughQuoteMeta,
    final_quote: finalQuoteMeta,
    rough_quote_url: allQuotes[0].rough_quote_url || (roughQuoteMeta ? roughQuoteMeta.public_url : ''),
    final_quote_url: allQuotes[0].final_quote_url || (finalQuoteMeta ? finalQuoteMeta.public_url : ''),
    access_token: quote.access_token,
    public_url: `/quote.html?token=${quote.access_token}`,
    customer_phone_raw: quote.customer_phone,
    views_count: viewsCount,
    dispatches,
    messaging_live: Boolean(msgCfg.enabled && (msgCfg.smsWebhookUrl || msgCfg.kakaoWebhookUrl))
  });
});

// 4. Send Quote to Customer via SMS or KakaoTalk (Supports selecting 가견적 / 최종견적 or specific quoteId)
router.post('/by-project/:projectId/send', requireAuth, checkPartnerAccess, async (req, res) => {
  const projectId = parseInt(req.params.projectId, 10);
  const { channel = 'kakao', recipientPhone, recipientName, message, origin, quoteType, quoteId } = req.body || {};

  if (!['sms', 'kakao'].includes(channel)) {
    return res.status(400).json({ error: '발송 채널은 문자(sms) 또는 카카오톡(kakao)이어야 합니다.' });
  }

  const allQuotes = db.prepare(`
    SELECT q.*, p.org_id, p.product, c.name as customer_name, c.phone as customer_phone
    FROM quotes q
    JOIN projects p ON q.project_id = p.id
    JOIN customers c ON p.customer_id = c.id
    WHERE q.project_id = ? AND q.status = 'published'
    ORDER BY q.version DESC, q.id DESC
  `).all(projectId);

  let quote = allQuotes[0] || null;
  if (quoteId) {
    const byId = allQuotes.find(q => q.id === Number(quoteId));
    if (byId) quote = byId;
  } else if (quoteType) {
    const byType = allQuotes.find(q => (q.quote_type || '가견적') === quoteType);
    if (byType) quote = byType;
  }

  if (!quote) {
    return res.status(404).json({ error: '발송할 발행 견적서가 없습니다. 먼저 견적서를 발행해 주세요.' });
  }
  if (req.partnerOrgId && quote.org_id !== req.partnerOrgId) {
    return res.status(403).json({ error: '접근 권한이 없습니다.' });
  }

  const targetPhone = String(recipientPhone || quote.customer_phone || '').trim();
  const cleanDigits = targetPhone.replace(/\D/g, '');
  if (cleanDigits.length < 10 || cleanDigits.length > 11) {
    return res.status(400).json({ error: '올바른 수신 휴대폰 번호를 입력해 주세요.' });
  }

  const targetName = String(recipientName || quote.customer_name || '고객').trim();
  const baseOrigin = origin || `${req.protocol}://${req.get('host')}`;
  const quoteUrl = `${baseOrigin}/quote.html?token=${quote.access_token}`;

  const defaultMsg = `[KCC홈씨씨] ${targetName} 고객님, 요청하신 ${quote.product || '창호'} 모바일 견적서가 도착했습니다.\n\n` +
    `■ 견적 구분: ${quote.quote_type || '가견적'} (v${quote.version})\n` +
    `■ 예상 금액: ${Number(quote.total_price).toLocaleString('ko-KR')}원 (VAT 포함)\n\n` +
    `▼ 내 모바일 견적서 확인하기\n${quoteUrl}\n\n` +
    `※ 고객님 본인 이름(${quote.customer_name})과 휴대폰 번호로 로그인 후 열람하실 수 있습니다.`;

  const finalMessage = String(message || defaultMsg).trim();
  const msgConfig = getMessagingConfig();

  let provider = 'simulation';
  let status = 'sent';
  let providerMessageId = `SIM-${channel.toUpperCase()}-${Date.now()}`;
  let errorMessage = null;

  const webhookUrl = channel === 'kakao' ? msgConfig.kakaoWebhookUrl : msgConfig.smsWebhookUrl;
  if (msgConfig.enabled && webhookUrl) {
    provider = msgConfig.provider || 'webhook';
    try {
      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(msgConfig.apiKey ? { 'Authorization': `Bearer ${msgConfig.apiKey}` } : {})
        },
        body: JSON.stringify({
          channel,
          senderPhone: msgConfig.senderPhone,
          kakaoPfId: msgConfig.kakaoPfId,
          to: cleanDigits,
          recipientName: targetName,
          message: finalMessage,
          buttonUrl: quoteUrl,
          buttonTitle: '나의 모바일 견적서 확인하기'
        })
      });
      if (!resp.ok) {
        throw new Error(`발송 API 응답 오류 (${resp.status})`);
      }
      const respJson = await resp.json().catch(() => ({}));
      providerMessageId = respJson.messageId || respJson.id || `LIVE-${Date.now()}`;
    } catch (err) {
      status = 'failed';
      errorMessage = err.message;
    }
  }

  const sentBy = req.user?.name || '관리자';
  const insertDispatch = db.prepare(`
    INSERT INTO quote_dispatches (
      quote_id, project_id, channel, recipient_name, recipient_phone,
      message, quote_url, provider, status, provider_message_id, error_message, sent_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const dispResult = insertDispatch.run(
    quote.id, projectId, channel, targetName, targetPhone,
    finalMessage, quoteUrl, provider, status, providerMessageId, errorMessage, sentBy
  );

  if (status === 'failed') {
    return res.status(502).json({
      error: `외부 발송 서버 전송 실패: ${errorMessage}`,
      dispatch_id: dispResult.lastInsertRowid
    });
  }

  const channelLabel = channel === 'kakao' ? '카카오 알림톡' : '문자(LMS)';

  // Record in consultations & update project stage if still early
  db.prepare(`
    INSERT INTO consultations (project_id, user_id, author_name, type, content, is_important)
    VALUES (?, ?, ?, 'notes', ?, 0)
  `).run(
    projectId,
    req.user?.id || null,
    sentBy,
    `[${channelLabel} 견적서 발송] 수신: ${targetName} (${targetPhone}) · 견적 v${quote.version} (${Number(quote.total_price).toLocaleString('ko-KR')}원)`
  );

  db.prepare(`
    UPDATE projects
    SET status = CASE WHEN status IN ('신규접수', '상담중', '가견적요청') THEN '견적안내' ELSE status END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(projectId);

  recordAuditLog({
    projectId,
    action: `${channelLabel} 발송`,
    detail: `${targetName}(${targetPhone})에게 모바일 견적서(v${quote.version}) ${channelLabel} 발송 완료`,
    req
  });

  const dispatchRecord = db.prepare(`
    SELECT id, channel, recipient_name, recipient_phone, message, quote_url, provider, status, sent_by,
           strftime('%Y-%m-%d %H:%M', created_at, 'localtime') as sent_at
    FROM quote_dispatches
    WHERE id = ?
  `).get(dispResult.lastInsertRowid);

  res.status(201).json({
    success: true,
    mode: provider === 'simulation' ? 'simulation' : 'live',
    channel,
    quote_url: quoteUrl,
    dispatch: dispatchRecord,
    message: provider === 'simulation'
      ? `${channelLabel} 발송 이력이 등록되었습니다. (현재 연동 테스트 모드 · 실발송 API 연동 시 즉시 전송됩니다)`
      : `${channelLabel}이 고객 휴대폰(${targetPhone})으로 정상 발송되었습니다.`
  });
});

// 5. Get Quote Details (Internal View - includes Cost & Margin)
router.get('/:id', requireAuth, checkPartnerAccess, (req, res) => {
  const quoteId = parseInt(req.params.id, 10);
  const quote = db.prepare(`
    SELECT q.*, p.customer_id, p.org_id, p.partner_name, c.name as customer_name, c.phone as customer_phone
    FROM quotes q
    JOIN projects p ON q.project_id = p.id
    JOIN customers c ON p.customer_id = c.id
    WHERE q.id = ?
  `).get(quoteId);

  if (!quote) {
    return res.status(404).json({ error: '견적서를 찾을 수 없습니다.' });
  }
  if (req.partnerOrgId && quote.org_id !== req.partnerOrgId) {
    return res.status(403).json({ error: '접근 권한이 없습니다.' });
  }

  const items = db.prepare('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order ASC').all(quoteId);
  const views = db.prepare('SELECT * FROM quote_views WHERE quote_id = ? ORDER BY viewed_at DESC').all(quoteId);
  const dispatches = db.prepare('SELECT * FROM quote_dispatches WHERE quote_id = ? ORDER BY id DESC').all(quoteId);

  res.json({
    quote,
    items,
    views,
    dispatches
  });
});

export default router;
