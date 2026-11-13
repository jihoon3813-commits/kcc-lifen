import express from 'express';
import { db } from '../db/index.js';

const router = express.Router();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

function normalizeUtmToChannel(utmSource) {
  const raw = String(utmSource || '').trim();
  if (!raw) return '';
  const low = raw.toLowerCase();
  if (low === 'naver_bs' || low.includes('브랜드검색')) return '네이버 브랜드검색';
  if (low.includes('blog') || low.includes('cafe') || low.includes('블로그') || low.includes('카페')) return '네이버 블로그·카페';
  if (low.includes('naver') || low.includes('네이버')) return '네이버 검색광고';
  if (low.includes('daangn') || low.includes('karrot') || low.includes('당근')) return '당근마켓';
  if (low.includes('insta') || low === 'ig' || low.includes('인스타')) return '인스타그램';
  if (low.includes('facebook') || low === 'fb' || low.includes('meta') || low.includes('페이스북') || low.includes('메타')) return '페이스북(메타)';
  if (low.includes('kakao') || low.includes('카카오')) return '카카오 광고';
  if (low.includes('youtube') || low === 'yt' || low.includes('유튜브')) return '유튜브';
  if (low.includes('google') || low.includes('gdn') || low.includes('구글')) return '구글 검색/GDN';
  return raw;
}

function resolveOrganization(partnerInput) {
  if (!partnerInput) return null;
  const p = String(partnerInput).trim();
  if (!p || p === '직영' || p.toLowerCase() === 'lifeandjoy') return { id: 1, name: '직영', isDirect: true };

  const org = db.prepare('SELECT id, name, code, phone FROM organizations WHERE name = ? OR code = ?').get(p, p);
  if (org) return org;

  if (p.toLowerCase().includes('hanbit') || p.includes('한빛')) {
    const hanbit = db.prepare("SELECT id, name, code, phone FROM organizations WHERE name LIKE '%한빛%'").get();
    if (hanbit) return hanbit;
  }
  if (p.toLowerCase().includes('rium') || p.includes('리움')) {
    const rium = db.prepare("SELECT id, name, code, phone FROM organizations WHERE name LIKE '%리움%'").get();
    if (rium) return rium;
  }
  return null;
}

function resolveTrackingContext({ ch, link, partner, utm_source, utm_medium, utm_campaign, product_name }) {
  const linkCode = String(ch || link || '').trim();
  let matchedLink = null;
  if (linkCode) {
    matchedLink = db.prepare('SELECT * FROM landing_links WHERE code = ?').get(linkCode) || null;
  }

  let targetOrgId = 1;
  let partnerName = '직영';
  let partnerObj = null;

  const partnerCandidate = partner || matchedLink?.partner_name || '';
  if (partnerCandidate && partnerCandidate !== '직영') {
    const org = resolveOrganization(partnerCandidate);
    if (org && !org.isDirect) {
      targetOrgId = org.id;
      partnerName = org.name;
      partnerObj = org;
    } else if (matchedLink?.partner_name && matchedLink.partner_name !== '직영') {
      partnerName = matchedLink.partner_name;
    }
  }

  if (matchedLink) {
    return {
      linkId: matchedLink.id,
      linkCode: matchedLink.code,
      linkActive: Boolean(matchedLink.is_active),
      channel: matchedLink.channel,
      campaign: matchedLink.name,
      medium: matchedLink.medium || utm_medium || '',
      productCategory: matchedLink.product_category || '창호',
      productName: matchedLink.product_name || product_name || 'KCC 홈씨씨 창호',
      targetOrgId,
      partnerName,
      partnerObj
    };
  }

  const normalizedUtm = normalizeUtmToChannel(utm_source);
  const channel = normalizedUtm || (partnerName !== '직영' ? '파트너 전용링크' : '기본 랜딩(직접유입)');
  const campaign = String(utm_campaign || '').trim();

  return {
    linkId: null,
    linkCode: linkCode || '',
    linkActive: true,
    channel,
    campaign,
    medium: String(utm_medium || '').trim(),
    productCategory: '창호',
    productName: product_name || 'KCC 홈씨씨 창호',
    targetOrgId,
    partnerName,
    partnerObj
  };
}

// 1. Log landing event (page view, cta click)
router.post('/event', (req, res) => {
  try {
    const {
      event_type,
      product_name,
      partner,
      ch,
      link,
      utm_source,
      utm_medium,
      utm_campaign,
      preview
    } = req.body || {};

    if (preview === true || preview === '1' || preview === 1) {
      return res.json({ success: true, preview: true });
    }

    const ctx = resolveTrackingContext({
      ch,
      link,
      partner,
      utm_source,
      utm_medium,
      utm_campaign,
      product_name
    });

    const ip = getClientIp(req);
    const ua = req.headers['user-agent'] || '';
    const type = event_type || 'page_view';

    db.prepare(`
      INSERT INTO landing_events (
        event_type, product_name, partner_name, channel,
        landing_link_id, campaign_name,
        utm_source, utm_medium, utm_campaign, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      type,
      ctx.productName,
      ctx.partnerName,
      ctx.channel,
      ctx.linkId,
      ctx.campaign || null,
      utm_source || ctx.channel || null,
      utm_medium || ctx.medium || null,
      utm_campaign || ctx.campaign || null,
      ip,
      ua
    );

    res.json({
      success: true,
      channel: ctx.channel,
      campaign: ctx.campaign,
      linkId: ctx.linkId
    });
  } catch (err) {
    console.error('Landing event error:', err);
    res.status(500).json({ error: '이벤트 기록 실패' });
  }
});

// 2. Submit consultation or free measurement from landing page
router.post('/submit', (req, res) => {
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
    const cleanPhone = rawDigits.length === 11
      ? `${rawDigits.slice(0, 3)}-${rawDigits.slice(3, 7)}-${rawDigits.slice(7)}`
      : `${rawDigits.slice(0, 3)}-${rawDigits.slice(3, 6)}-${rawDigits.slice(6)}`;

    const cleanRegion = String(region || '').trim();
    if (!cleanRegion) {
      return res.status(400).json({ error: '설치 지역을 선택해 주세요.' });
    }

    const ctx = resolveTrackingContext({
      ch,
      link,
      partner,
      utm_source,
      utm_medium,
      utm_campaign,
      product_name: 'KCC 홈씨씨 창호'
    });

    // Duplicate check: within 60 seconds from same phone
    const recentProject = db.prepare(`
      SELECT p.id, p.landing_link_id, p.created_at
      FROM projects p
      JOIN customers c ON p.customer_id = c.id
      WHERE c.phone = ? AND datetime(p.created_at, 'localtime') >= datetime('now', '-60 seconds', 'localtime')
      ORDER BY p.id DESC LIMIT 1
    `).get(cleanPhone);

    if (recentProject) {
      if (ctx.linkId && !recentProject.landing_link_id) {
        db.prepare(`
          UPDATE projects
          SET source = ?, ad_channel = ?, ad_campaign = ?, landing_link_id = ?
          WHERE id = ?
        `).run(ctx.channel, ctx.channel, ctx.campaign || null, ctx.linkId, recentProject.id);
      }
      return res.json({
        success: true,
        alreadySubmitted: true,
        receiptId: recentProject.id,
        channel: ctx.channel,
        campaign: ctx.campaign,
        message: '이미 상담 신청이 접수되었습니다. 담당자가 순차적으로 연락드리겠습니다.'
      });
    }

    const addressParts = [cleanRegion];
    if (district && district.trim()) addressParts.push(district.trim());
    if (apartment && apartment.trim()) addressParts.push(apartment.trim());
    const fullAddress = addressParts.join(' ');

    let customer = db.prepare('SELECT id FROM customers WHERE phone = ?').get(cleanPhone);
    if (!customer) {
      const custResult = db.prepare(`
        INSERT INTO customers (org_id, name, phone, address, marketing_agreed)
        VALUES (?, ?, ?, ?, 1)
      `).run(ctx.targetOrgId, cleanName, cleanPhone, fullAddress);
      customer = { id: custResult.lastInsertRowid };
    } else {
      db.prepare(`
        UPDATE customers
        SET name = ?, address = CASE WHEN length(?) > length(address) THEN ? ELSE address END, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(cleanName, fullAddress, fullAddress, customer.id);
    }

    const maxProject = db.prepare('SELECT MAX(id) as max_id FROM projects').get();
    const nextProjectId = Math.max(3101, (maxProject?.max_id || 3100) + 1);

    const isMeasure = purpose === 'measure';
    const purposeLabel = isMeasure ? '무료 방문실측 예약' : '월 납입금 견적상담';
    const channelDisplay = ctx.campaign ? `${ctx.channel} (${ctx.campaign})` : ctx.channel;

    const noteLines = [
      `[랜딩페이지 온라인 접수]`,
      `• 유입 광고채널: ${channelDisplay}`,
      `• 신청 유형: ${purposeLabel}`,
      `• 고객 성함: ${cleanName}`,
      `• 연락처: ${cleanPhone}`,
      `• 설치 지역: ${fullAddress}`,
      `• 희망 평형: ${size || '미선택 / 상담 후 결정'}`,
      `• 교체 공간: ${scope || '미선택 / 전체 상담'}`
    ];
    if (ctx.partnerName && ctx.partnerName !== '직영') {
      noteLines.push(`• 귀속 파트너: ${ctx.partnerName}`);
    }

    const noteText = noteLines.join('\n');

    db.prepare(`
      INSERT INTO projects (
        id, customer_id, org_id, title, product, status, label, source,
        landing_link_id, ad_channel, ad_campaign,
        partner_name, owner_name, note
      ) VALUES (?, ?, ?, ?, ?, '신규접수', ?, ?, ?, ?, ?, ?, '미배정', ?)
    `).run(
      nextProjectId,
      customer.id,
      ctx.targetOrgId,
      `${cleanName} 고객 ${ctx.productCategory} ${isMeasure ? '실측예약' : '렌탈상담'}`,
      ctx.productCategory || '창호',
      isMeasure ? '실측요청' : '상담요청',
      ctx.channel,
      ctx.linkId,
      ctx.channel,
      ctx.campaign || null,
      ctx.partnerName,
      noteText
    );

    db.prepare(`
      INSERT INTO consultations (project_id, user_id, author_name, type, content, is_important)
      VALUES (?, NULL, '랜딩시스템', 'notes', ?, 1)
    `).run(
      nextProjectId,
      `${purposeLabel} 온라인 접수 완료\n유입 채널: ${channelDisplay}\n지역: ${fullAddress}\n희망평형: ${size || '미정'}\n희망공간: ${scope || '미정'}`
    );

    const ip = getClientIp(req);
    const ua = req.headers['user-agent'] || '';

    db.prepare(`
      INSERT INTO audit_logs (project_id, user_id, user_name, action, detail, ip_address)
      VALUES (?, NULL, '랜딩시스템', '고객접수', ?, ?)
    `).run(
      nextProjectId,
      `${channelDisplay} 접수 (접수번호: ${nextProjectId}, 성함: ${cleanName}, 연락처: ${cleanPhone})`,
      ip
    );

    db.prepare(`
      INSERT INTO landing_events (
        event_type, product_name, partner_name, channel,
        landing_link_id, campaign_name,
        utm_source, utm_medium, utm_campaign, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      'consultation_request',
      ctx.productName,
      ctx.partnerName,
      ctx.channel,
      ctx.linkId,
      ctx.campaign || null,
      utm_source || ctx.channel || null,
      utm_medium || ctx.medium || null,
      utm_campaign || ctx.campaign || null,
      ip,
      ua
    );

    res.status(201).json({
      success: true,
      receiptId: nextProjectId,
      customerName: cleanName,
      phone: cleanPhone,
      purpose: purposeLabel,
      partnerName: ctx.partnerName,
      channel: ctx.channel,
      campaign: ctx.campaign,
      message: '상담 신청이 성공적으로 접수되었습니다. 담당자가 빠른 시일 내에 연락드리겠습니다.'
    });
  } catch (err) {
    console.error('Landing submit error:', err);
    res.status(500).json({ error: '상담 접수 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' });
  }
});

// 3. Partner or cloned landing link config info
router.get('/info', (req, res) => {
  const { partner, ch, link } = req.query;
  const ctx = resolveTrackingContext({ ch, link, partner });

  res.json({
    brand: 'KCC 홈씨씨 창호 렌탈',
    company: '(주)라이프앤조이',
    tel: '1588-0883',
    partner: ctx.partnerObj
      ? { name: ctx.partnerObj.name, code: ctx.partnerObj.code, phone: ctx.partnerObj.phone }
      : (ctx.partnerName !== '직영' ? { name: ctx.partnerName } : null),
    link: ctx.linkId
      ? {
          id: ctx.linkId,
          code: ctx.linkCode,
          name: ctx.campaign,
          channel: ctx.channel,
          productCategory: ctx.productCategory,
          partnerName: ctx.partnerName
        }
      : null
  });
});

export default router;
