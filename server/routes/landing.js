import express from 'express';
import { convexClient, api, isProductionConvex } from '../convex.js';
import { notifyNewCustomer } from '../../api/_lib/discordHelper.js';
import {
  DEFAULT_DAANGN_SHEET_ID,
  DEFAULT_DAANGN_GID,
  fetchGoogleSheetRows,
  parseCsvToRowObjects,
  syncDaangnRowsToConvex,
} from '../../api/_lib/daangnLeadHelper.js';

const router = express.Router();

function resolveEventDevice(req, bodyDevice) {
  if (bodyDevice === '모바일' || bodyDevice === 'PC') return bodyDevice;
  const ua = String(req.headers?.['user-agent'] || '');
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua)
    ? '모바일'
    : 'PC';
}

// 1. Track landing page view or CTA click -> Convex Production
router.post('/event', async (req, res) => {
  try {
    const {
      event_type = 'page_view',
      product_name = 'KCC 홈씨씨 창호',
      partner,
      ch,
      link,
      utm_source,
      utm_medium,
      utm_campaign,
      device,
    } = req.body || {};

    await convexClient.mutation(api.crm.recordLandingEvent, {
      eventType: String(event_type || 'page_view'),
      productName: product_name ? String(product_name) : 'KCC 홈씨씨 창호',
      channel: ch || link || utm_source || undefined,
      partnerName: partner ? String(partner) : '직영',
      campaignName: utm_campaign ? String(utm_campaign) : undefined,
      utmSource: utm_source ? String(utm_source) : undefined,
      utmMedium: utm_medium ? String(utm_medium) : undefined,
      utmCampaign: utm_campaign ? String(utm_campaign) : undefined,
      device: resolveEventDevice(req, device ? String(device).trim() : ''),
    });

    res.json({
      success: true,
      channel: ch || link || utm_source || '기본 랜딩(직접유입)',
      campaign: utm_campaign || '',
    });
  } catch (err) {
    console.error('[Convex] Landing event error:', err);
    res.status(500).json({ error: '이벤트 기록 실패' });
  }
});

// 2. Submit consultation or free measurement from landing page -> Convex Production
router.post('/submit', async (req, res) => {
  try {
    const {
      name, phone, region, district, apartment,
      size, scope, purpose, product, partner, ch, link,
      utm_source, utm_medium, utm_campaign
    } = req.body || {};

    const cleanName = String(name || '').trim();
    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({ error: '성함을 두 글자 이상 입력해 주세요.' });
    }

    const rawDigits = String(phone || '').replace(/\D/g, '');
    if (!/^01[016789]\d{7,8}$/.test(rawDigits)) {
      return res.status(400).json({ error: '올바른 휴대전화 번호를 입력해 주세요.' });
    }

    const cleanRegion = String(region || '').trim();
    if (!cleanRegion) {
      return res.status(400).json({ error: '설치 지역을 선택해 주세요.' });
    }

    const baseArgs = {
      name: cleanName,
      phone: String(phone || ''),
      region: cleanRegion,
      district: district ? String(district).trim() : undefined,
      apartment: apartment ? String(apartment).trim() : undefined,
      size: size ? String(size).trim() : undefined,
      scope: scope ? String(scope).trim() : undefined,
      purpose: purpose ? String(purpose) : 'cost',
      partner: partner ? String(partner) : undefined,
      ch: (ch || link) ? String(ch || link) : undefined,
      utm_source: utm_source ? String(utm_source) : undefined,
      utm_medium: utm_medium ? String(utm_medium) : undefined,
      utm_campaign: utm_campaign ? String(utm_campaign) : undefined,
    };
    let result;
    try {
      result = await convexClient.mutation(api.landing.submitConsultation, {
        ...baseArgs,
        ...(product ? { product: String(product).trim() } : {}),
      });
    } catch (mutErr) {
      if (product) {
        result = await convexClient.mutation(api.landing.submitConsultation, baseArgs);
      } else {
        throw mutErr;
      }
    }

    const addrParts = [cleanRegion, district, apartment, size ? `${size}평` : '']
      .map((s) => String(s || '').trim())
      .filter(Boolean);
    const isGreen = product === '그린리모델링' || ch === 'green_remodeling' || String(scope || '').includes('[그린리모델링]');
    await notifyNewCustomer({
      category: purpose === 'measure' ? '무료 방문실측 예약' : (isGreen ? '그린리모델링 상담' : '월 납입금 견적상담'),
      receiptId: result?.receiptId,
      customerName: result?.customerName || cleanName,
      phone: String(phone || ''),
      address: addrParts.join(' '),
      product: scope ? String(scope).trim() : (isGreen ? '그린리모델링' : '창호'),
      channel: result?.channel || ch || link || utm_source || '기본 랜딩(직접유입)',
      partner: result?.partnerName || partner || '직영',
    });

    res.status(result.alreadySubmitted ? 200 : 201).json({ ...result, persisted: true });
  } catch (err) {
    console.error('[Convex] Landing submit error:', err);
    res.status(500).json({ error: '상담 접수 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' });
  }
});

// 3. Get landing info & partner attribution -> Convex Production
router.get('/info', async (req, res) => {
  try {
    const partner = req.query.partner ? String(req.query.partner) : undefined;
    const ch = (req.query.ch || req.query.link) ? String(req.query.ch || req.query.link) : undefined;
    const info = await convexClient.query(api.landing.getInfo, { partner, ch });
    res.json(info);
  } catch (err) {
    console.error('[Convex] Landing info error:', err);
    res.status(500).json({ error: '랜딩 정보 조회 실패' });
  }
});

// 4. Daangn Lead Form Google Sheets auto-sync & webhook -> Convex Production (당근마켓 > 상담리드)
router.get('/daangn-lead', async (req, res) => {
  try {
    const sheetId = req.query?.sheetId || DEFAULT_DAANGN_SHEET_ID;
    const gid = req.query?.gid || DEFAULT_DAANGN_GID;
    if (!isProductionConvex && sheetId === DEFAULT_DAANGN_SHEET_ID) {
      return res.json({
        success: true,
        skippedInDev: true,
        insertedCount: 0,
        skippedCount: 0,
        inserted: [],
        skipped: [],
        message: '개발 서버에서는 운영 당근 리드 시트 자동 동기화가 비활성화되어 있습니다.',
      });
    }
    const rows = await fetchGoogleSheetRows(sheetId, gid);
    const result = await syncDaangnRowsToConvex(convexClient, rows);
    res.json(result);
  } catch (err) {
    console.error('[Convex] Daangn lead GET sync error:', err);
    res.status(err.status || 500).json({
      success: false,
      code: err.code || 'SYNC_ERROR',
      error: err.message || '당근 리드폼 시트 동기화 실패',
    });
  }
});

router.post('/daangn-lead', async (req, res) => {
  try {
    const body = req.body || {};

    if (
      body.action === 'sync_sheet' ||
      (!body.rows && !body.row && !body.headers && !body.csv && !body.phone && !body['연락처'] && !body['전화번호'])
    ) {
      const sheetId = body.sheetId || req.query?.sheetId || DEFAULT_DAANGN_SHEET_ID;
      const gid = body.gid || req.query?.gid || DEFAULT_DAANGN_GID;
      if (!isProductionConvex && sheetId === DEFAULT_DAANGN_SHEET_ID) {
        return res.json({
          success: true,
          skippedInDev: true,
          insertedCount: 0,
          skippedCount: 0,
          inserted: [],
          skipped: [],
          message: '개발 서버에서는 운영 당근 리드 시트 동기화가 비활성화되어 있습니다.',
        });
      }
      const rows = await fetchGoogleSheetRows(sheetId, gid);
      const result = await syncDaangnRowsToConvex(convexClient, rows, {
        partner: body.partner,
        owner: body.owner,
      });
      return res.json(result);
    }

    if (typeof body.csv === 'string' && body.csv.trim()) {
      const rows = parseCsvToRowObjects(body.csv);
      const result = await syncDaangnRowsToConvex(convexClient, rows, {
        partner: body.partner,
        owner: body.owner,
      });
      return res.json(result);
    }

    let rawRows = [];
    if (Array.isArray(body.rows)) {
      rawRows = body.rows;
    } else if (Array.isArray(body)) {
      rawRows = body;
    } else if (body.row && typeof body.row === 'object') {
      rawRows = [body.row];
    } else if (Array.isArray(body.headers) && Array.isArray(body.values)) {
      rawRows = [{ headers: body.headers, values: body.values }];
    } else {
      rawRows = [body];
    }

    const result = await syncDaangnRowsToConvex(convexClient, rawRows, {
      partner: body.partner,
      owner: body.owner,
    });
    res.status(result.insertedCount > 0 ? 201 : 200).json(result);
  } catch (err) {
    console.error('[Convex] Daangn lead POST sync error:', err);
    res.status(err.status || 500).json({
      success: false,
      code: err.code || 'SYNC_ERROR',
      error: err.message || '당근 리드폼 동기화 처리 중 오류가 발생했습니다.',
    });
  }
});

export default router;
