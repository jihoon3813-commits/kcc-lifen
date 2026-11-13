import express from 'express';
import { convexClient, api } from '../convex.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  formatProductsAndLinks,
  generateLinkCode,
  ensureDefaultProductsInConvex,
} from '../../api/_lib/productHelper.js';

const router = express.Router();

async function getFormattedProductsData(reqUser = null) {
  let data = await convexClient.query(api.crm.listProductsAndLinks, {});
  if (!data?.products?.length) {
    await ensureDefaultProductsInConvex(convexClient, api);
    data = await convexClient.query(api.crm.listProductsAndLinks, {});
  }
  return formatProductsAndLinks(data, reqUser);
}

router.get('/', async (req, res) => {
  try {
    const formatted = await getFormattedProductsData(req.user);
    res.json(formatted);
  } catch (err) {
    console.error('[Convex] GET /api/products error:', err);
    res.status(500).json({ error: '상품 및 광고링크 조회 중 오류가 발생했습니다.' });
  }
});

router.get('/links', async (req, res) => {
  try {
    const formatted = await getFormattedProductsData(req.user);
    res.json({ landingLinks: formatted.landingLinks });
  } catch (err) {
    console.error('[Convex] GET /api/products/links error:', err);
    res.status(500).json({ error: '광고링크 목록 조회 중 오류가 발생했습니다.' });
  }
});

router.post('/links', requireAuth, async (req, res) => {
  const body = req.body || {};
  const cleanChannel = String(body.channel || '').trim();
  const cleanName = String(body.name || '').trim();
  if (!cleanChannel) {
    return res.status(400).json({ error: '어디에 광고할지 광고채널 정보를 입력해 주세요.' });
  }
  if (!cleanName) {
    return res.status(400).json({ error: '광고 캠페인 또는 링크 구분명을 입력해 주세요.' });
  }

  try {
    const data = await convexClient.query(api.crm.listProductsAndLinks, {});
    const existingCodes = new Set((data.landingLinks || []).map((l) => l.code));
    const code = generateLinkCode(cleanChannel, body.code, existingCodes);
    const partnerName =
      req.user?.role === 'partner' && req.user?.org_name
        ? req.user.org_name
        : String(body.partnerName || '직영').trim() || '직영';

    const saved = await convexClient.mutation(api.crm.upsertLandingLink, {
      productId: body.productId ? Number(body.productId) : undefined,
      code,
      name: cleanName,
      channel: cleanChannel,
      campaign: String(body.campaign || cleanName).trim(),
      partnerName,
      targetUrl: String(body.targetUrl || '/landing/').trim(),
      active: body.isActive !== false,
    });

    const formatted = await getFormattedProductsData(req.user);
    const created = formatted.landingLinks.find((l) => Number(l.id) === Number(saved.linkId)) || null;
    res.status(201).json({
      id: saved.linkId,
      link: created,
      landingLinks: formatted.landingLinks,
      message: '광고채널용 복제 랜딩 링크가 생성되었습니다.',
    });
  } catch (err) {
    console.error('[Convex] POST /api/products/links error:', err);
    res.status(500).json({ error: '광고링크 생성 중 오류가 발생했습니다.' });
  }
});

router.patch('/links/:id', requireAuth, async (req, res) => {
  const linkId = parseInt(req.params.id, 10);
  if (!linkId || Number.isNaN(linkId)) {
    return res.status(400).json({ error: '올바른 링크 ID가 필요합니다.' });
  }

  try {
    const data = await convexClient.query(api.crm.listProductsAndLinks, {});
    const existing = (data.landingLinks || []).find((l) => Number(l.linkId) === linkId);
    if (!existing) {
      return res.status(404).json({ error: '복제 랜딩 링크를 찾을 수 없습니다.' });
    }
    if (req.user?.role === 'partner' && existing.partnerName !== req.user.org_name) {
      return res.status(403).json({ error: '본인 파트너사의 링크만 수정할 수 있습니다.' });
    }

    const body = req.body || {};
    const existingCodes = new Set(
      (data.landingLinks || []).filter((l) => Number(l.linkId) !== linkId).map((l) => l.code)
    );
    const nextChannel = String(body.channel || existing.channel).trim();
    const nextName = String(body.name || existing.name).trim();
    const nextCode = body.code
      ? generateLinkCode(nextChannel, body.code, existingCodes)
      : existing.code;

    await convexClient.mutation(api.crm.upsertLandingLink, {
      linkId,
      productId: body.productId !== undefined ? Number(body.productId) : existing.productId,
      code: nextCode,
      name: nextName,
      channel: nextChannel,
      campaign: String(body.campaign || body.name || existing.campaign || existing.name).trim(),
      partnerName:
        req.user?.role === 'partner'
          ? existing.partnerName
          : String(body.partnerName || existing.partnerName || '직영').trim(),
      targetUrl: String(body.targetUrl || existing.targetUrl || '/landing/').trim(),
      active: body.isActive !== undefined ? Boolean(body.isActive) : existing.active,
    });

    const formatted = await getFormattedProductsData(req.user);
    const updated = formatted.landingLinks.find((l) => Number(l.id) === linkId) || null;
    res.json({
      ok: true,
      link: updated,
      landingLinks: formatted.landingLinks,
      message: '복제 랜딩 링크가 수정되었습니다.',
    });
  } catch (err) {
    console.error('[Convex] PATCH /api/products/links/:id error:', err);
    res.status(500).json({ error: '광고링크 수정 중 오류가 발생했습니다.' });
  }
});

router.delete('/links/:id', requireAuth, async (req, res) => {
  const linkId = parseInt(req.params.id, 10);
  if (!linkId || Number.isNaN(linkId)) {
    return res.status(400).json({ error: '올바른 링크 ID가 필요합니다.' });
  }

  try {
    const data = await convexClient.query(api.crm.listProductsAndLinks, {});
    const existing = (data.landingLinks || []).find((l) => Number(l.linkId) === linkId);
    if (!existing) {
      return res.status(404).json({ error: '복제 랜딩 링크를 찾을 수 없습니다.' });
    }
    if (req.user?.role === 'partner' && existing.partnerName !== req.user.org_name) {
      return res.status(403).json({ error: '본인 파트너사의 링크만 삭제할 수 있습니다.' });
    }

    await convexClient.mutation(api.crm.deleteLandingLink, { linkId });
    const formatted = await getFormattedProductsData(req.user);
    res.json({
      ok: true,
      landingLinks: formatted.landingLinks,
      message: '복제 랜딩 링크를 삭제했습니다. (기존 유입 고객의 채널 기록은 유지됩니다.)',
    });
  } catch (err) {
    console.error('[Convex] DELETE /api/products/links/:id error:', err);
    res.status(500).json({ error: '광고링크 삭제 중 오류가 발생했습니다.' });
  }
});

router.post('/', requireAuth, requireRole('hq_admin'), async (req, res) => {
  const { name, category, desc, url } = req.body || {};
  if (!name || !category) return res.status(400).json({ error: '상품명과 카테고리는 필수입니다.' });

  try {
    await convexClient.mutation(api.crm.upsertProduct, {
      name: String(name).trim(),
      code: `PROD_${Date.now().toString(36)}`,
      category: String(category).trim(),
      description: String(desc || '').trim(),
      url: String(url || '/landing/').trim(),
      active: true,
    });
    const formatted = await getFormattedProductsData(req.user);
    res.status(201).json({
      message: '상품이 등록되었습니다.',
      products: formatted.products,
    });
  } catch (err) {
    console.error('[Convex] POST /api/products error:', err);
    res.status(500).json({ error: '상품 등록 중 오류가 발생했습니다.' });
  }
});

router.patch('/:id', requireAuth, requireRole('hq_admin'), async (req, res) => {
  const prodId = parseInt(req.params.id, 10);
  const { name, category, desc, url } = req.body || {};
  try {
    const data = await convexClient.query(api.crm.listProductsAndLinks, {});
    const existing = (data.products || []).find((p) => Number(p.prodId) === prodId);
    if (!existing) {
      return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    }
    await convexClient.mutation(api.crm.upsertProduct, {
      prodId,
      name: String(name ?? existing.name).trim(),
      code: existing.code,
      category: String(category ?? existing.category).trim(),
      description: String(desc ?? existing.description ?? '').trim(),
      url: String(url ?? existing.url ?? '/landing/').trim(),
      active: existing.active,
    });
    const formatted = await getFormattedProductsData(req.user);
    res.json({
      message: '상품이 수정되었습니다.',
      products: formatted.products,
    });
  } catch (err) {
    console.error('[Convex] PATCH /api/products/:id error:', err);
    res.status(500).json({ error: '상품 수정 중 오류가 발생했습니다.' });
  }
});

export default router;
