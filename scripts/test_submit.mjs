import { db, initDatabase } from '../server/db/index.js';

initDatabase();

async function run() {
  const req = {
    body: {
      name: '김지훈',
      phone: '010-2222-2222',
      region: '인천광역시',
      district: '파주운정',
      apartment: '푸르지오',
      size: '30평대',
      scope: '거실 발코니',
      purpose: 'cost',
      ch: '',
      partner: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: ''
    },
    headers: {},
    socket: { remoteAddress: '127.0.0.1' }
  };

  const {
    name, phone, region, district, apartment,
    size, scope, purpose, partner, ch, link,
    utm_source, utm_medium, utm_campaign
  } = req.body || {};

  const cleanName = String(name || '').trim();
  const rawDigits = String(phone || '').replace(/\D/g, '');
  const cleanPhone = rawDigits.length === 11
    ? `${rawDigits.slice(0, 3)}-${rawDigits.slice(3, 7)}-${rawDigits.slice(7)}`
    : `${rawDigits.slice(0, 3)}-${rawDigits.slice(3, 6)}-${rawDigits.slice(6)}`;
  const cleanRegion = String(region || '').trim();

  // Test duplicate check
  console.log('Testing duplicate check...');
  try {
    const recentProject = db.prepare(`
      SELECT p.id, p.landing_link_id, p.created_at
      FROM projects p
      JOIN customers c ON p.customer_id = c.id
      WHERE c.phone = ? AND datetime(p.created_at, 'localtime') >= datetime('now', '-60 seconds', 'localtime')
      ORDER BY p.id DESC LIMIT 1
    `).get(cleanPhone);
    console.log('Duplicate check passed, result:', recentProject);
  } catch (e) {
    console.error('Error in duplicate check:', e);
  }

  // Test resolveTrackingContext
  console.log('Testing resolveTrackingContext...');
  function resolveOrganization(partnerInput) {
    if (!partnerInput) return null;
    const p = String(partnerInput).trim();
    if (!p || p === '직영' || p.toLowerCase() === 'lifeandjoy') return { id: 1, name: '직영', isDirect: true };
    const org = db.prepare('SELECT id, name, code, phone FROM organizations WHERE name = ? OR code = ?').get(p, p);
    if (org) return org;
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
    return {
      linkId: null,
      linkCode: linkCode || '',
      linkActive: true,
      channel: '기본 랜딩(직접유입)',
      campaign: '',
      medium: '',
      productCategory: '창호',
      productName: product_name || 'KCC 홈씨씨 창호',
      targetOrgId,
      partnerName,
      partnerObj
    };
  }

  const ctx = resolveTrackingContext({ ch, link, partner, utm_source, utm_medium, utm_campaign });
  console.log('ctx:', ctx);

  const addressParts = [cleanRegion];
  if (district && district.trim()) addressParts.push(district.trim());
  if (apartment && apartment.trim()) addressParts.push(apartment.trim());
  const fullAddress = addressParts.join(' ');

  console.log('Testing customer query/insert...');
  try {
    let customer = db.prepare('SELECT id FROM customers WHERE phone = ?').get(cleanPhone);
    console.log('Existing customer:', customer);
    if (!customer) {
      const custResult = db.prepare(`
        INSERT INTO customers (org_id, name, phone, address, marketing_agreed)
        VALUES (?, ?, ?, ?, 1)
      `).run(ctx.targetOrgId, cleanName, cleanPhone, fullAddress);
      customer = { id: custResult.lastInsertRowid };
      console.log('Inserted customer:', customer);
    } else {
      db.prepare(`
        UPDATE customers
        SET name = ?, address = CASE WHEN length(?) > length(address) THEN ? ELSE address END, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(cleanName, fullAddress, fullAddress, customer.id);
      console.log('Updated customer');
    }

    const maxProject = db.prepare('SELECT MAX(id) as max_id FROM projects').get();
    const nextProjectId = Math.max(3101, (maxProject?.max_id || 3100) + 1);
    console.log('nextProjectId:', nextProjectId);

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

    console.log('Testing projects insert...');
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
    console.log('projects insert SUCCESS!');

    console.log('Testing consultations insert...');
    db.prepare(`
      INSERT INTO consultations (project_id, user_id, author_name, type, content, is_important)
      VALUES (?, NULL, '랜딩시스템', 'notes', ?, 1)
    `).run(
      nextProjectId,
      `${purposeLabel} 온라인 접수 완료\n유입 채널: ${channelDisplay}\n지역: ${fullAddress}\n희망평형: ${size || '미정'}\n희망공간: ${scope || '미정'}`
    );
    console.log('consultations insert SUCCESS!');

    console.log('Testing audit_logs insert...');
    db.prepare(`
      INSERT INTO audit_logs (project_id, user_id, user_name, action, detail, ip_address)
      VALUES (?, NULL, '랜딩시스템', '고객접수', ?, ?)
    `).run(
      nextProjectId,
      `${channelDisplay} 접수 (접수번호: ${nextProjectId}, 성함: ${cleanName}, 연락처: ${cleanPhone})`,
      '127.0.0.1'
    );
    console.log('audit_logs insert SUCCESS!');

    console.log('Testing landing_events insert...');
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
      '127.0.0.1',
      'test-agent'
    );
    console.log('landing_events insert SUCCESS!');

  } catch (err) {
    console.error('FAILED AT STEP:', err);
  }
}

run();
