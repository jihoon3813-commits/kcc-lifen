import express from 'express';
import { convexClient, api } from '../convex.js';

const router = express.Router();

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
      size, scope, purpose, partner, ch, link,
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

    const result = await convexClient.mutation(api.landing.submitConsultation, {
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
    });

    res.status(result.alreadySubmitted ? 200 : 201).json(result);
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

export default router;
