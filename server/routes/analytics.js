import express from 'express';
import { db } from '../db/index.js';
import { requireAuth, checkPartnerAccess } from '../middleware/auth.js';

const router = express.Router();

function maskIp(ip) {
  if (!ip) return '-';
  const clean = String(ip).replace('::ffff:', '');
  if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
  }
  return clean.slice(0, 10) + '***';
}

function parseDeviceFromUA(ua) {
  const s = String(ua || '').toLowerCase();
  if (!s) return '기타';
  if (/iphone|ipad|android|mobile/.test(s)) return '모바일';
  return 'PC';
}

function normalizeChannelLabel(rawSource, adChannel, llChannel) {
  const val = String(adChannel || llChannel || rawSource || '').trim();
  if (!val || val === '랜딩페이지') return '기본 랜딩(미분류)';
  return val;
}

function buildDateFilter(columnExpr, period) {
  if (period === 'all') return '';
  if (period === '1') {
    return ` AND date(${columnExpr}, '+9 hours') = date('now', '+9 hours')`;
  }
  const days = Math.max(1, parseInt(period, 10) || 30);
  return ` AND date(${columnExpr}, '+9 hours') >= date('now', '+9 hours', '-${days - 1} days')`;
}

router.get('/overview', requireAuth, checkPartnerAccess, (req, res) => {
  const rawPeriod = String(req.query.period || '30');
  const period = ['all', '1', '7', '30'].includes(rawPeriod) ? rawPeriod : '30';

  let allowedOrgIds = [];
  let allowedOrgNames = [];
  if (req.partnerOrgId) {
    const mainOrg = db.prepare('SELECT id, name FROM organizations WHERE id = ?').get(req.partnerOrgId);
    if (mainOrg) {
      allowedOrgIds.push(mainOrg.id);
      allowedOrgNames.push(mainOrg.name);
    }
    const children = db.prepare('SELECT id, name FROM organizations WHERE parent_id = ?').all(req.partnerOrgId);
    for (const c of children) {
      allowedOrgIds.push(c.id);
      allowedOrgNames.push(c.name);
    }
  }

  const projPartnerFilter = allowedOrgIds.length
    ? ` AND (p.org_id IN (${allowedOrgIds.map(() => '?').join(',')}) OR p.partner_name IN (${allowedOrgNames.map(() => '?').join(',')}))`
    : '';
  const projPartnerParams = allowedOrgIds.length ? [...allowedOrgIds, ...allowedOrgNames] : [];

  const evPartnerFilter = allowedOrgNames.length
    ? ` AND le.partner_name IN (${allowedOrgNames.map(() => '?').join(',')})`
    : '';
  const evPartnerParams = allowedOrgNames.length ? [...allowedOrgNames] : [];

  const projDateSql = buildDateFilter('p.created_at', period);
  const evDateSql = buildDateFilter('le.created_at', period);
  const contractDateSql = buildDateFilter('c.created_at', period);

  // 1. Summary KPIs
  const totalViews = db.prepare(`
    SELECT COUNT(*) as cnt
    FROM landing_events le
    WHERE le.event_type = 'page_view' ${evPartnerFilter} ${evDateSql}
  `).get(...evPartnerParams)?.cnt || 0;

  const totalCustomers = db.prepare(`
    SELECT COUNT(*) as cnt
    FROM projects p
    WHERE 1=1 ${projPartnerFilter} ${projDateSql}
  `).get(...projPartnerParams)?.cnt || 0;

  const quotedCustomers = db.prepare(`
    SELECT COUNT(DISTINCT p.id) as cnt
    FROM projects p
    JOIN quotes q ON q.project_id = p.id
    WHERE q.status = 'published' ${projPartnerFilter} ${projDateSql}
  `).get(...projPartnerParams)?.cnt || 0;

  const viewedCustomers = db.prepare(`
    SELECT COUNT(DISTINCT p.id) as cnt
    FROM projects p
    JOIN quotes q ON q.project_id = p.id
    JOIN quote_views qv ON qv.quote_id = q.id
    WHERE q.status = 'published' ${projPartnerFilter} ${projDateSql}
  `).get(...projPartnerParams)?.cnt || 0;

  const totalContracts = db.prepare(`
    SELECT COUNT(DISTINCT c.id) as cnt
    FROM contracts c
    JOIN projects p ON c.project_id = p.id
    WHERE 1=1 ${projPartnerFilter} ${contractDateSql}
  `).get(...projPartnerParams)?.cnt || 0;

  const paidContracts = db.prepare(`
    SELECT COUNT(DISTINCT c.id) as cnt
    FROM contracts c
    JOIN projects p ON c.project_id = p.id
    WHERE c.paid_amount >= c.amount AND c.amount > 0 ${projPartnerFilter} ${contractDateSql}
  `).get(...projPartnerParams)?.cnt || 0;

  const totalRevenue = db.prepare(`
    SELECT COALESCE(SUM(c.paid_amount), 0) as total
    FROM contracts c
    JOIN projects p ON c.project_id = p.id
    WHERE 1=1 ${projPartnerFilter} ${contractDateSql}
  `).get(...projPartnerParams)?.total || 0;

  // 2. Daily trend (last 7 or 14 days depending on period; if 'all', show recent 14 active days / rolling 14 days)
  const trendDays = period === '1' ? 1 : (period === '7' ? 7 : 14);
  const trend = [];
  if (period === '1') {
    for (let h = 9; h <= 20; h++) {
      const hourStr = String(h).padStart(2, '0');
      const vCnt = db.prepare(`
        SELECT COUNT(*) as cnt FROM landing_events le
        WHERE le.event_type = 'page_view'
          AND date(le.created_at, '+9 hours') = date('now', '+9 hours')
          AND strftime('%H', le.created_at, '+9 hours') = ?
          ${evPartnerFilter}
      `).get(hourStr, ...evPartnerParams)?.cnt || 0;
      const lCnt = db.prepare(`
        SELECT COUNT(*) as cnt FROM projects p
        WHERE date(p.created_at, '+9 hours') = date('now', '+9 hours')
          AND strftime('%H', p.created_at, '+9 hours') = ?
          ${projPartnerFilter}
      `).get(hourStr, ...projPartnerParams)?.cnt || 0;
      trend.push({ label: `${h}시`, views: vCnt, leads: lCnt });
    }
  } else {
    const anchorRow = db.prepare(`
      SELECT MAX(day) as max_day FROM (
        SELECT date(created_at, '+9 hours') as day FROM projects
        UNION
        SELECT date(created_at, '+9 hours') as day FROM landing_events
      )
    `).get();
    const todayKst = db.prepare(`SELECT date('now', '+9 hours') as today`).get().today;
    const anchorDate = (period === 'all' && anchorRow?.max_day && anchorRow.max_day < todayKst)
      ? anchorRow.max_day
      : todayKst;

    for (let i = trendDays - 1; i >= 0; i--) {
      const dayRow = db.prepare(`SELECT date(?, '-' || ? || ' days') as day`).get(anchorDate, i);
      const day = dayRow.day;

      const views = db.prepare(`
        SELECT COUNT(*) as cnt FROM landing_events le
        WHERE le.event_type = 'page_view'
          AND date(le.created_at, '+9 hours') = ?
          ${evPartnerFilter}
      `).get(day, ...evPartnerParams)?.cnt || 0;

      const leads = db.prepare(`
        SELECT COUNT(*) as cnt FROM projects p
        WHERE date(p.created_at, '+9 hours') = ?
          ${projPartnerFilter}
      `).get(day, ...projPartnerParams)?.cnt || 0;

      trend.push({
        label: day.slice(5).replace('-', '.'),
        views,
        leads
      });
    }
  }

  // 3. Channels breakdown (merge projects + landing_events)
  const channelMap = new Map();
  const ensureChannel = chName => {
    const key = chName || '직접등록';
    if (!channelMap.has(key)) {
      channelMap.set(key, { channel: key, views: 0, leads: 0, quotes: 0, contracts: 0 });
    }
    return channelMap.get(key);
  };

  const evByChannel = db.prepare(`
    SELECT COALESCE(ll.channel, le.channel, '직접 방문') as ch_name,
           COUNT(*) as views
    FROM landing_events le
    LEFT JOIN landing_links ll ON ll.id = le.landing_link_id
    WHERE le.event_type = 'page_view' ${evPartnerFilter} ${evDateSql}
    GROUP BY ch_name
  `).all(...evPartnerParams);

  for (const row of evByChannel) {
    const chName = row.ch_name === '랜딩페이지' || row.ch_name === '직접 방문' ? '기본 랜딩(미분류)' : row.ch_name;
    ensureChannel(chName).views += row.views || 0;
  }

  const projRows = db.prepare(`
    SELECT p.id, p.source, p.ad_channel, ll.channel as ll_channel,
           (SELECT COUNT(*) FROM quotes q WHERE q.project_id = p.id AND q.status = 'published') as has_quote,
           (SELECT COUNT(*) FROM contracts c WHERE c.project_id = p.id) as has_contract
    FROM projects p
    LEFT JOIN landing_links ll ON ll.id = p.landing_link_id
    WHERE 1=1 ${projPartnerFilter} ${projDateSql}
  `).all(...projPartnerParams);

  for (const r of projRows) {
    const chName = normalizeChannelLabel(r.source, r.ad_channel, r.ll_channel);
    const item = ensureChannel(chName);
    item.leads += 1;
    if ((r.has_quote || 0) > 0) item.quotes += 1;
    if ((r.has_contract || 0) > 0) item.contracts += 1;
  }

  const totalLeadsAll = [...channelMap.values()].reduce((s, x) => s + x.leads, 0);
  const channels = [...channelMap.values()]
    .map(ch => ({
      ...ch,
      conversionRate: ch.views > 0 ? Number(((ch.leads / ch.views) * 100).toFixed(1)) : 0,
      sharePct: totalLeadsAll > 0 ? Math.round((ch.leads / totalLeadsAll) * 100) : 0
    }))
    .sort((a, b) => b.leads - a.leads || b.views - a.views);

  // 4. Cloned landing links performance
  const linksSql = allowedOrgNames.length
    ? `SELECT * FROM landing_links WHERE partner_name IN (${allowedOrgNames.map(() => '?').join(',')}) ORDER BY is_active DESC, id DESC`
    : 'SELECT * FROM landing_links ORDER BY is_active DESC, id DESC';
  const rawLinks = allowedOrgNames.length ? db.prepare(linksSql).all(...allowedOrgNames) : db.prepare(linksSql).all();

  const landingLinks = rawLinks.map(ll => {
    const views = db.prepare(`
      SELECT COUNT(*) as cnt FROM landing_events le
      WHERE le.landing_link_id = ? AND le.event_type = 'page_view' ${evDateSql}
    `).get(ll.id)?.cnt || 0;

    const leads = db.prepare(`
      SELECT COUNT(*) as cnt FROM projects p
      WHERE p.landing_link_id = ? ${projDateSql}
    `).get(ll.id)?.cnt || 0;

    const quotes = db.prepare(`
      SELECT COUNT(DISTINCT q.project_id) as cnt
      FROM quotes q
      JOIN projects p ON p.id = q.project_id
      WHERE p.landing_link_id = ? AND q.status = 'published' ${projDateSql}
    `).get(ll.id)?.cnt || 0;

    const contracts = db.prepare(`
      SELECT COUNT(DISTINCT c.project_id) as cnt
      FROM contracts c
      JOIN projects p ON p.id = c.project_id
      WHERE p.landing_link_id = ? ${projDateSql}
    `).get(ll.id)?.cnt || 0;

    return {
      id: ll.id,
      code: ll.code,
      name: ll.name,
      channel: ll.channel,
      medium: ll.medium || '',
      productName: ll.product_name,
      productCategory: ll.product_category,
      partnerName: ll.partner_name,
      targetUrl: ll.target_url || '/landing/',
      isActive: Boolean(ll.is_active),
      views,
      leads,
      quotes,
      contracts,
      conversionRate: views > 0 ? Number(((leads / views) * 100).toFixed(1)) : 0
    };
  });

  // 5. Products breakdown
  const allProducts = db.prepare('SELECT * FROM products ORDER BY id ASC').all();
  const products = allProducts.map(prod => {
    const views = db.prepare(`
      SELECT COUNT(*) as cnt FROM landing_events le
      WHERE le.product_name = ? AND le.event_type = 'page_view' ${evPartnerFilter} ${evDateSql}
    `).get(prod.name, ...evPartnerParams)?.cnt || 0;

    const leads = db.prepare(`
      SELECT COUNT(*) as cnt FROM projects p
      WHERE p.product = ? ${projPartnerFilter} ${projDateSql}
    `).get(prod.category, ...projPartnerParams)?.cnt || 0;

    const quotes = db.prepare(`
      SELECT COUNT(DISTINCT q.project_id) as cnt
      FROM quotes q
      JOIN projects p ON p.id = q.project_id
      WHERE p.product = ? AND q.status = 'published' ${projPartnerFilter} ${projDateSql}
    `).get(prod.category, ...projPartnerParams)?.cnt || 0;

    const contracts = db.prepare(`
      SELECT COUNT(DISTINCT c.project_id) as cnt
      FROM contracts c
      JOIN projects p ON p.id = c.project_id
      WHERE p.product = ? ${projPartnerFilter} ${projDateSql}
    `).get(prod.category, ...projPartnerParams)?.cnt || 0;

    return {
      id: prod.id,
      name: prod.name,
      category: prod.category,
      views,
      leads,
      quotes,
      contracts,
      conversionRate: views > 0 ? Number(((leads / views) * 100).toFixed(1)) : 0
    };
  });

  // 6. Recent landing events (masked IP)
  const rawEvents = db.prepare(`
    SELECT le.*, ll.name as ll_name, ll.channel as ll_channel
    FROM landing_events le
    LEFT JOIN landing_links ll ON ll.id = le.landing_link_id
    WHERE 1=1 ${evPartnerFilter}
    ORDER BY le.id DESC
    LIMIT 20
  `).all(...evPartnerParams);

  const eventLabelMap = {
    page_view: '페이지 방문',
    consultation_request: '상담 신청',
    inquiry: '상담 신청',
    quote_request: '견적 요청',
    contract: '계약 등록'
  };

  const recentEvents = rawEvents.map(ev => ({
    id: ev.id,
    createdAt: ev.created_at,
    productName: ev.product_name || 'KCC 홈씨씨 창호',
    channel: ev.ll_channel || ev.channel || '직접 방문',
    campaignName: ev.campaign_name || ev.ll_name || ev.utm_campaign || '',
    partnerName: ev.partner_name || '직영',
    ipMasked: maskIp(ev.ip_address),
    device: parseDeviceFromUA(ev.user_agent),
    eventType: ev.event_type,
    eventLabel: eventLabelMap[ev.event_type] || ev.event_type
  }));

  res.json({
    period,
    summary: {
      totalViews,
      totalCustomers,
      quotedCustomers,
      viewedCustomers,
      totalContracts,
      paidContracts,
      totalRevenue
    },
    trend,
    channels,
    landingLinks,
    products,
    recentEvents
  });
});

export default router;
