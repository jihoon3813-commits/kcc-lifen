import express from 'express';
import crypto from 'node:crypto';
import { db } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

function sanitizeLinkCode(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function getChannelSlug(channelName) {
  const s = String(channelName || '').toLowerCase();
  if (s.includes('네이버') && s.includes('블로그')) return 'naver_blog';
  if (s.includes('네이버') && s.includes('브랜드')) return 'naver_bs';
  if (s.includes('네이버') || s.includes('naver')) return 'naver_sa';
  if (s.includes('당근') || s.includes('karrot') || s.includes('daangn')) return 'daangn';
  if (s.includes('인스타') || s.includes('insta')) return 'insta';
  if (s.includes('카카오') || s.includes('kakao')) return 'kakao';
  if (s.includes('페이스북') || s.includes('메타') || s.includes('meta') || s.includes('facebook')) return 'meta';
  if (s.includes('유튜브') || s.includes('youtube')) return 'yt';
  if (s.includes('구글') || s.includes('google') || s.includes('gdn')) return 'google';
  if (s.includes('오프라인') || s.includes('현수막') || s.includes('전단') || s.includes('qr')) return 'qr';
  if (s.includes('파트너')) return 'partner';
  return 'ad';
}

function generateUniqueLinkCode(channelName, requestedCode = '') {
  const cleaned = sanitizeLinkCode(requestedCode);
  if (cleaned) return cleaned;

  const prefix = getChannelSlug(channelName);
  for (let i = 0; i < 8; i++) {
    const rand = crypto.randomBytes(2).toString('hex');
    const candidate = `${prefix}_${rand}`;
    const exists = db.prepare('SELECT id FROM landing_links WHERE code = ?').get(candidate);
    if (!exists) return candidate;
  }
  return `${prefix}_${Date.now().toString(36).slice(-5)}`;
}

function listProductsFormatted(reqUser = null) {
  const products = db.prepare('SELECT * FROM products ORDER BY id ASC').all();
  const isPartner = reqUser?.role === 'partner';
  return products.map(p => {
    const views = db
      .prepare("SELECT COUNT(*) as cnt FROM landing_events WHERE product_name = ? AND event_type = 'page_view'")
      .get(p.name)?.cnt || 0;
    const linkCount = isPartner
      ? (db.prepare('SELECT COUNT(*) as cnt FROM landing_links WHERE (product_id = ? OR product_category = ?) AND partner_name = ?').get(p.id, p.category, reqUser.org_name)?.cnt || 0)
      : (db.prepare('SELECT COUNT(*) as cnt FROM landing_links WHERE (product_id = ? OR product_category = ?)').get(p.id, p.category)?.cnt || 0);
    return {
      id: p.id,
      name: p.name,
      code: p.code,
      category: p.category,
      desc: p.price_text || '',
      url: p.url,
      icon: p.category === '창호' ? 'window' : (p.category === '주방' ? 'kitchen' : 'bath'),
      color: p.category === '창호' ? '#edf3f9' : (p.category === '주방' ? '#f4f1ec' : '#edf4f1'),
      views,
      linkCount,
      active: !!p.url
    };
  });
}

export function listLandingLinksWithStats(reqUser = null) {
  const isPartner = reqUser?.role === 'partner' && reqUser?.org_name;
  const rows = isPartner
    ? db.prepare('SELECT * FROM landing_links WHERE partner_name = ? ORDER BY is_active DESC, id DESC').all(reqUser.org_name)
    : db.prepare('SELECT * FROM landing_links ORDER BY is_active DESC, id DESC').all();

  const countViewsStmt = db.prepare("SELECT COUNT(*) as cnt FROM landing_events WHERE landing_link_id = ? AND event_type = 'page_view'");
  const countLeadsStmt = db.prepare('SELECT COUNT(*) as cnt FROM projects WHERE landing_link_id = ?');
  const countQuotesStmt = db.prepare(`
    SELECT COUNT(DISTINCT q.project_id) as cnt
    FROM quotes q
    JOIN projects p ON p.id = q.project_id
    WHERE p.landing_link_id = ? AND q.status = 'published'
  `);
  const countContractsStmt = db.prepare(`
    SELECT COUNT(DISTINCT c.project_id) as cnt
    FROM contracts c
    JOIN projects p ON p.id = c.project_id
    WHERE p.landing_link_id = ?
  `);

  return rows.map(ll => {
    const views = countViewsStmt.get(ll.id)?.cnt || 0;
    const leads = countLeadsStmt.get(ll.id)?.cnt || 0;
    const quotes = countQuotesStmt.get(ll.id)?.cnt || 0;
    const contracts = countContractsStmt.get(ll.id)?.cnt || 0;
    const conversionRate = views > 0 ? Number(((leads / views) * 100).toFixed(1)) : 0;

    return {
      id: ll.id,
      code: ll.code,
      productId: ll.product_id,
      productName: ll.product_name,
      productCategory: ll.product_category,
      name: ll.name,
      channel: ll.channel,
      medium: ll.medium || '',
      campaign: ll.campaign || ll.name,
      partnerName: ll.partner_name || '직영',
      targetUrl: ll.target_url || '/landing/',
      includeUtm: Boolean(ll.include_utm),
      memo: ll.memo || '',
      isActive: Boolean(ll.is_active),
      createdBy: ll.created_by || '',
      createdAt: ll.created_at,
      views,
      leads,
      quotes,
      contracts,
      conversionRate
    };
  });
}

router.get('/', (req, res) => {
  res.json({
    products: listProductsFormatted(req.user),
    landingLinks: listLandingLinksWithStats(req.user)
  });
});

router.get('/links', (req, res) => {
  res.json({
    landingLinks: listLandingLinksWithStats(req.user)
  });
});

router.post('/links', requireAuth, (req, res) => {
  const {
    productId,
    name,
    channel,
    medium,
    campaign,
    partnerName,
    code,
    targetUrl,
    includeUtm,
    memo,
    isActive
  } = req.body || {};

  const cleanChannel = String(channel || '').trim();
  const cleanName = String(name || '').trim();
  if (!cleanChannel) {
    return res.status(400).json({ error: '어디에 광고할지 광고채널 정보를 입력해 주세요.' });
  }
  if (!cleanName) {
    return res.status(400).json({ error: '광고 캠페인 또는 링크 구분명을 입력해 주세요.' });
  }

  let prod = null;
  if (productId) {
    prod = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(productId));
  }
  if (!prod) {
    prod = db.prepare("SELECT * FROM products WHERE category = '창호' ORDER BY id ASC LIMIT 1").get()
      || db.prepare('SELECT * FROM products ORDER BY id ASC LIMIT 1').get();
  }

  const resolvedProductId = prod ? prod.id : null;
  const resolvedProductName = prod ? prod.name : 'KCC 홈씨씨 창호';
  const resolvedProductCategory = prod ? prod.category : '창호';
  const resolvedTargetUrl = String(targetUrl || prod?.url || '/landing/').trim() || '/landing/';

  const isPartner = req.user?.role === 'partner' && req.user?.org_name;
  const resolvedPartner = isPartner ? req.user.org_name : (String(partnerName || '직영').trim() || '직영');

  let finalCode = generateUniqueLinkCode(cleanChannel, code);
  if (code && sanitizeLinkCode(code)) {
    const dup = db.prepare('SELECT id FROM landing_links WHERE code = ?').get(finalCode);
    if (dup) {
      return res.status(400).json({ error: `이미 사용 중인 식별 코드(${finalCode})입니다. 다른 코드를 입력하거나 비워두어 자동 생성하세요.` });
    }
  }

  const result = db.prepare(`
    INSERT INTO landing_links (
      code, product_id, product_name, product_category, name, channel, medium, campaign,
      partner_name, target_url, include_utm, memo, is_active, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    finalCode,
    resolvedProductId,
    resolvedProductName,
    resolvedProductCategory,
    cleanName,
    cleanChannel,
    String(medium || '').trim(),
    String(campaign || cleanName).trim(),
    resolvedPartner,
    resolvedTargetUrl,
    includeUtm ? 1 : 0,
    String(memo || '').trim(),
    isActive === false ? 0 : 1,
    req.user?.name || '관리자'
  );

  const allLinks = listLandingLinksWithStats(req.user);
  const created = allLinks.find(x => x.id === Number(result.lastInsertRowid)) || null;

  res.status(201).json({
    id: result.lastInsertRowid,
    link: created,
    landingLinks: allLinks,
    message: '광고채널용 복제 랜딩 링크가 생성되었습니다.'
  });
});

router.patch('/links/:id', requireAuth, (req, res) => {
  const linkId = parseInt(req.params.id, 10);
  const existing = db.prepare('SELECT * FROM landing_links WHERE id = ?').get(linkId);
  if (!existing) {
    return res.status(404).json({ error: '복제 랜딩 링크를 찾을 수 없습니다.' });
  }
  if (req.user?.role === 'partner' && existing.partner_name !== req.user.org_name) {
    return res.status(403).json({ error: '본인 파트너사의 링크만 수정할 수 있습니다.' });
  }

  const {
    productId,
    name,
    channel,
    medium,
    campaign,
    partnerName,
    code,
    targetUrl,
    includeUtm,
    memo,
    isActive
  } = req.body || {};

  const nextChannel = channel !== undefined ? String(channel).trim() : existing.channel;
  const nextName = name !== undefined ? String(name).trim() : existing.name;
  if (!nextChannel || !nextName) {
    return res.status(400).json({ error: '광고채널과 캠페인/링크명은 필수입니다.' });
  }

  let nextCode = existing.code;
  if (code !== undefined && String(code).trim()) {
    nextCode = sanitizeLinkCode(code);
    if (!nextCode) {
      return res.status(400).json({ error: '식별 코드는 영문, 숫자, -, _ 조합으로 입력해 주세요.' });
    }
    const dup = db.prepare('SELECT id FROM landing_links WHERE code = ? AND id != ?').get(nextCode, linkId);
    if (dup) {
      return res.status(400).json({ error: `이미 사용 중인 식별 코드(${nextCode})입니다.` });
    }
  }

  let prodId = existing.product_id;
  let prodName = existing.product_name;
  let prodCategory = existing.product_category;
  let nextTargetUrl = targetUrl !== undefined ? (String(targetUrl).trim() || '/landing/') : existing.target_url;
  if (productId && Number(productId) !== existing.product_id) {
    const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(productId));
    if (prod) {
      prodId = prod.id;
      prodName = prod.name;
      prodCategory = prod.category;
      if (targetUrl === undefined && prod.url) nextTargetUrl = prod.url;
    }
  }

  const isPartner = req.user?.role === 'partner' && req.user?.org_name;
  const nextPartner = isPartner
    ? req.user.org_name
    : (partnerName !== undefined ? (String(partnerName).trim() || '직영') : existing.partner_name);

  db.prepare(`
    UPDATE landing_links
    SET code = ?,
        product_id = ?,
        product_name = ?,
        product_category = ?,
        name = ?,
        channel = ?,
        medium = ?,
        campaign = ?,
        partner_name = ?,
        target_url = ?,
        include_utm = ?,
        memo = ?,
        is_active = ?
    WHERE id = ?
  `).run(
    nextCode,
    prodId,
    prodName,
    prodCategory,
    nextName,
    nextChannel,
    medium !== undefined ? String(medium).trim() : existing.medium,
    campaign !== undefined ? String(campaign).trim() : nextName,
    nextPartner,
    nextTargetUrl,
    includeUtm !== undefined ? (includeUtm ? 1 : 0) : existing.include_utm,
    memo !== undefined ? String(memo).trim() : existing.memo,
    isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active,
    linkId
  );

  // Synchronize existing leads linked to this cloned landing link when channel/campaign is edited
  if (nextChannel !== existing.channel || nextName !== existing.name) {
    db.prepare(`
      UPDATE projects
      SET source = ?, ad_channel = ?, ad_campaign = ?
      WHERE landing_link_id = ?
    `).run(nextChannel, nextChannel, nextName, linkId);

    db.prepare(`
      UPDATE landing_events
      SET channel = ?, campaign_name = ?
      WHERE landing_link_id = ?
    `).run(nextChannel, nextName, linkId);
  }

  const allLinks = listLandingLinksWithStats(req.user);
  const updated = allLinks.find(x => x.id === linkId) || null;
  res.json({ ok: true, link: updated, landingLinks: allLinks, message: '복제 랜딩 링크가 수정되었습니다.' });
});

router.delete('/links/:id', requireAuth, (req, res) => {
  const linkId = parseInt(req.params.id, 10);
  const existing = db.prepare('SELECT * FROM landing_links WHERE id = ?').get(linkId);
  if (!existing) {
    return res.status(404).json({ error: '복제 랜딩 링크를 찾을 수 없습니다.' });
  }
  if (req.user?.role === 'partner' && existing.partner_name !== req.user.org_name) {
    return res.status(403).json({ error: '본인 파트너사의 링크만 삭제할 수 있습니다.' });
  }

  // Keep attributed channel/campaign text on historical leads & events, only clear link reference
  db.prepare('UPDATE projects SET landing_link_id = NULL WHERE landing_link_id = ?').run(linkId);
  db.prepare('UPDATE landing_events SET landing_link_id = NULL WHERE landing_link_id = ?').run(linkId);
  db.prepare('DELETE FROM landing_links WHERE id = ?').run(linkId);

  res.json({
    ok: true,
    landingLinks: listLandingLinksWithStats(req.user),
    message: '복제 랜딩 링크를 삭제했습니다. (기존 유입 고객의 채널 기록은 유지됩니다.)'
  });
});

router.post('/', requireAuth, requireRole('hq_admin'), (req, res) => {
  const { name, category, desc, url } = req.body;
  if (!name || !category) return res.status(400).json({ error: '상품명과 카테고리는 필수입니다.' });

  const code = `PROD_${Date.now()}`;
  db.prepare(`
    INSERT INTO products (name, code, price_text, category, url)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, code, desc || '', category, url || '');

  res.status(201).json({
    message: '상품이 등록되었습니다.',
    products: listProductsFormatted(req.user)
  });
});

router.patch('/:id', requireAuth, requireRole('hq_admin'), (req, res) => {
  const { name, category, desc, url } = req.body;
  db.prepare(`
    UPDATE products
    SET name = coalesce(?, name),
        category = coalesce(?, category),
        price_text = coalesce(?, price_text),
        url = coalesce(?, url)
    WHERE id = ?
  `).run(name, category, desc, url, req.params.id);

  res.json({
    message: '상품이 수정되었습니다.',
    products: listProductsFormatted(req.user)
  });
});

export default router;
