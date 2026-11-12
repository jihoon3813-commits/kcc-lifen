import express from 'express';
import { db } from '../db/index.js';

const router = express.Router();

// Helper to sanitize IP
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

// 1. Log landing event (page view, cta click)
router.post('/event', (req, res) => {
  try {
    const { event_type, product_name, partner, utm_source, utm_medium, utm_campaign } = req.body || {};
    const ip = getClientIp(req);
    const ua = req.headers['user-agent'] || '';

    let partnerName = '직영';
    if (partner) {
      const org = db.prepare('SELECT name FROM organizations WHERE name = ? OR code = ?').get(partner, partner);
      if (org) partnerName = org.name;
      else if (partner.includes('hanbit') || partner.includes('한빛')) partnerName = '한빛인테리어';
    }

    const type = event_type || 'page_view';
    const prod = product_name || 'KCC 홈씨씨 창호';
    const channel = utm_source ? `${utm_source} 유입` : (partnerName !== '직영' ? `파트너 (${partnerName})` : '직접 방문');

    db.prepare(`
      INSERT INTO landing_events (
        event_type, product_name, partner_name, channel,
        utm_source, utm_medium, utm_campaign, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(type, prod, partnerName, channel, utm_source || null, utm_medium || null, utm_campaign || null, ip, ua);

    res.json({ success: true });
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
      size, scope, purpose, partner,
      utm_source, utm_medium, utm_campaign
    } = req.body || {};

    // Validation
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

    // Duplicate check: within 60 seconds from same phone
    const recentProject = db.prepare(`
      SELECT p.id, p.created_at
      FROM projects p
      JOIN customers c ON p.customer_id = c.id
      WHERE c.phone = ? AND datetime(p.created_at, 'localtime') >= datetime('now', '-60 seconds', 'localtime')
      ORDER BY p.id DESC LIMIT 1
    `).get(cleanPhone);

    if (recentProject) {
      return res.json({
        success: true,
        alreadySubmitted: true,
        receiptId: recentProject.id,
        message: '이미 상담 신청이 접수되었습니다. 담당자가 순차적으로 연락드리겠습니다.'
      });
    }

    // Determine partner / organization
    let targetOrgId = 1;
    let partnerName = '직영';
    if (partner) {
      const org = db.prepare('SELECT id, name FROM organizations WHERE name = ? OR code = ?').get(partner, partner);
      if (org) {
        targetOrgId = org.id;
        partnerName = org.name;
      } else if (partner.includes('hanbit') || partner.includes('한빛')) {
        const hanbit = db.prepare("SELECT id, name FROM organizations WHERE name LIKE '%한빛%'").get();
        if (hanbit) {
          targetOrgId = hanbit.id;
          partnerName = hanbit.name;
        }
      }
    }

    // Build full address string
    const addressParts = [cleanRegion];
    if (district && district.trim()) addressParts.push(district.trim());
    if (apartment && apartment.trim()) addressParts.push(apartment.trim());
    const fullAddress = addressParts.join(' ');

    // Find or create customer
    let customer = db.prepare('SELECT id FROM customers WHERE phone = ?').get(cleanPhone);
    if (!customer) {
      const custResult = db.prepare(`
        INSERT INTO customers (org_id, name, phone, address, marketing_agreed)
        VALUES (?, ?, ?, ?, 1)
      `).run(targetOrgId, cleanName, cleanPhone, fullAddress);
      customer = { id: custResult.lastInsertRowid };
    } else {
      // Update address if more detailed
      db.prepare(`
        UPDATE customers
        SET name = ?, address = CASE WHEN length(?) > length(address) THEN ? ELSE address END, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(cleanName, fullAddress, fullAddress, customer.id);
    }

    // Determine project ID
    const maxProject = db.prepare('SELECT MAX(id) as max_id FROM projects').get();
    const nextProjectId = Math.max(3101, (maxProject?.max_id || 3100) + 1);

    const isMeasure = purpose === 'measure';
    const purposeLabel = isMeasure ? '무료 방문실측 예약' : '월 납입금 견적상담';
    const sourceLabel = utm_source
      ? `랜딩 (${utm_source})`
      : (partnerName !== '직영' ? `파트너 (${partnerName})` : '랜딩페이지');

    const noteLines = [
      `[랜딩페이지 온라인 접수]`,
      `• 신청 유형: ${purposeLabel}`,
      `• 고객 성함: ${cleanName}`,
      `• 연락처: ${cleanPhone}`,
      `• 설치 지역: ${fullAddress}`,
      `• 희망 평형: ${size || '미선택 / 상담 후 결정'}`,
      `• 교체 공간: ${scope || '미선택 / 전체 상담'}`,
      `• 유입 경로: ${sourceLabel}`
    ];
    if (utm_campaign) noteLines.push(`• 캠페인: ${utm_campaign}`);

    const noteText = noteLines.join('\n');

    // Insert project
    db.prepare(`
      INSERT INTO projects (
        id, customer_id, org_id, title, product, status, label, source,
        partner_name, owner_name, note
      ) VALUES (?, ?, ?, ?, '창호', '신규접수', ?, ?, ?, '미배정', ?)
    `).run(
      nextProjectId,
      customer.id,
      targetOrgId,
      `${cleanName} 고객 창호 ${isMeasure ? '실측예약' : '렌탈상담'}`,
      isMeasure ? '실측요청' : '상담요청',
      sourceLabel,
      partnerName,
      noteText
    );

    // Initial consultation log
    db.prepare(`
      INSERT INTO consultations (project_id, user_id, author_name, type, content, is_important)
      VALUES (?, NULL, '랜딩시스템', 'notes', ?, 1)
    `).run(nextProjectId, `${purposeLabel} 온라인 접수 완료\n지역: ${fullAddress}\n희망평형: ${size || '미정'}\n희망공간: ${scope || '미정'}`);

    const ip = getClientIp(req);
    const ua = req.headers['user-agent'] || '';

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (project_id, user_id, user_name, action, detail, ip_address)
      VALUES (?, NULL, '랜딩시스템', '고객접수', ?, ?)
    `).run(nextProjectId, `랜딩페이지 상담 접수 (접수번호: ${nextProjectId}, 성함: ${cleanName}, 연락처: ${cleanPhone})`, ip);
    db.prepare(`
      INSERT INTO landing_events (
        event_type, product_name, partner_name, channel,
        utm_source, utm_medium, utm_campaign, ip_address, user_agent, created_at
      ) VALUES (?, 'KCC 홈씨씨 창호', ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run('consultation_request', partnerName, sourceLabel, utm_source || null, utm_medium || null, utm_campaign || null, ip, ua);

    res.status(201).json({
      success: true,
      receiptId: nextProjectId,
      customerName: cleanName,
      phone: cleanPhone,
      purpose: purposeLabel,
      partnerName,
      message: '상담 신청이 성공적으로 접수되었습니다. 담당자가 빠른 시일 내에 연락드리겠습니다.'
    });
  } catch (err) {
    console.error('Landing submit error:', err);
    res.status(500).json({ error: '상담 접수 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' });
  }
});

// 3. Partner or landing config info
router.get('/info', (req, res) => {
  const { partner } = req.query;
  let partnerInfo = null;

  if (partner) {
    const org = db.prepare('SELECT id, name, code, contact_person, phone FROM organizations WHERE name = ? OR code = ?').get(partner, partner);
    if (org) {
      partnerInfo = {
        name: org.name,
        code: org.code,
        phone: org.phone
      };
    } else if (partner.includes('hanbit') || partner.includes('한빛')) {
      const hanbit = db.prepare("SELECT id, name, code, contact_person, phone FROM organizations WHERE name LIKE '%한빛%'").get();
      if (hanbit) {
        partnerInfo = {
          name: hanbit.name,
          code: hanbit.code,
          phone: hanbit.phone
        };
      }
    }
  }

  res.json({
    brand: 'KCC 홈씨씨 창호 렌탈',
    company: '(주)라이프앤조이',
    tel: '1588-0883',
    partner: partnerInfo
  });
});

export default router;
