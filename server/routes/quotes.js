import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import { db } from '../db/index.js';
import { convexClient, api } from '../convex.js';
import { config } from '../config.js';
import { requireAuth, checkPartnerAccess } from '../middleware/auth.js';
import { recordAuditLog } from '../middleware/audit.js';
import { parseEstimateFile } from '../utils/excelParser.js';
import {
  createQuoteInConvex,
  getProjectQuotePreviewFromConvex,
  sendProjectQuoteViaConvex
} from '../utils/quoteService.js';

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

// 2. Create or Publish Quote (Direct to Convex)
router.post('/', requireAuth, checkPartnerAccess, async (req, res) => {
  try {
    const result = await createQuoteInConvex(convexClient, api, {
      body: req.body,
      user: req.user,
      partnerOrgId: req.partnerOrgId
    });
    res.status(result.status).json(result.data);
  } catch (err) {
    console.error('[Convex] POST /api/quotes error:', err);
    res.status(500).json({ error: '견적서 저장 중 오류가 발생했습니다.' });
  }
});

// 3. Preview Published Quote by Project ID (Direct from Convex)
router.get('/by-project/:projectId/preview', requireAuth, checkPartnerAccess, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const requestedType = req.query.type ? String(req.query.type).trim() : '';
    const requestedQuoteId = req.query.quoteId ? parseInt(req.query.quoteId, 10) : null;
    const allowSimulate = req.query.simulate !== '0';
    const msgCfg = getMessagingConfig();

    const result = await getProjectQuotePreviewFromConvex(convexClient, api, {
      projectId,
      requestedType,
      requestedQuoteId,
      allowSimulate,
      partnerOrgId: req.partnerOrgId,
      user: req.user,
      messagingLive: Boolean(msgCfg.enabled && (msgCfg.smsWebhookUrl || msgCfg.kakaoWebhookUrl))
    });
    res.status(result.status).json(result.data);
  } catch (err) {
    console.error('[Convex] GET /api/quotes/by-project/:projectId/preview error:', err);
    res.status(500).json({ error: '견적 미리보기를 불러오지 못했습니다.' });
  }
});

// 4. Send Quote to Customer via SMS or KakaoTalk (Direct to Convex)
router.post('/by-project/:projectId/send', requireAuth, checkPartnerAccess, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const msgCfg = getMessagingConfig();
    const baseOrigin = `${req.protocol}://${req.get('host')}`;

    const result = await sendProjectQuoteViaConvex(convexClient, api, {
      projectId,
      body: req.body,
      user: req.user,
      partnerOrgId: req.partnerOrgId,
      baseOrigin,
      msgCfg
    });
    res.status(result.status).json(result.data);
  } catch (err) {
    console.error('[Convex] POST /api/quotes/by-project/:projectId/send error:', err);
    res.status(500).json({ error: '견적서 발송 처리 중 오류가 발생했습니다.' });
  }
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
