import express from 'express';
import { convexClient, api } from '../convex.js';
import { requireAuth, checkPartnerAccess } from '../middleware/auth.js';

const router = express.Router();

function isPartnerAllowed(req, project, organizations = []) {
  if (!req.partnerOrgId) return true;
  if (project.orgId && Number(project.orgId) === Number(req.partnerOrgId)) return true;

  const myOrg = organizations.find((o) => Number(o.orgId) === Number(req.partnerOrgId));
  const childOrgNames = new Set(
    organizations
      .filter((o) => Number(o.parentId) === Number(req.partnerOrgId))
      .map((o) => o.name)
  );
  if (myOrg) childOrgNames.add(myOrg.name);
  if (req.user?.org_name) childOrgNames.add(req.user.org_name);

  return childOrgNames.has(project.partnerName);
}

function formatKstDateSlice(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return String(isoStr).slice(0, 10);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function formatShortKst(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return String(isoStr);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kst.getUTCDate()).padStart(2, '0');
  const hh = String(kst.getUTCHours()).padStart(2, '0');
  const mi = String(kst.getUTCMinutes()).padStart(2, '0');
  return `${mm}.${dd} ${hh}:${mi}`;
}

// 1. Get Customers / Projects List (Direct from Convex Production)
router.get('/', requireAuth, checkPartnerAccess, async (req, res) => {
  try {
    const { q, stage, product, partner, period, sort } = req.query;
    const data = await convexClient.query(api.crm.listCustomersData, {});
    const { projects, quotes, landingLinks, quoteViews, quoteDispatches, organizations } = data;

    const linkById = new Map(landingLinks.map((l) => [Number(l.linkId), l]));
    const linkByCode = new Map(landingLinks.map((l) => [l.code, l]));

    const quotesByProj = new Map();
    const viewsByProj = new Map();
    for (const v of quoteViews) {
      viewsByProj.set(v.projectId, (viewsByProj.get(v.projectId) || 0) + 1);
    }
    const dispatchesByProj = new Map();
    for (const d of quoteDispatches) {
      dispatchesByProj.set(d.projectId, (dispatchesByProj.get(d.projectId) || 0) + 1);
    }

    for (const qt of quotes) {
      if (!quotesByProj.has(qt.projectId)) quotesByProj.set(qt.projectId, []);
      quotesByProj.get(qt.projectId).push({
        id: qt.version,
        version: qt.version,
        title: qt.title,
        quoteType: qt.quoteType || '가견적',
        totalPrice: qt.totalPrice,
        discountAmount: qt.discountAmount || 0,
        token: qt.accessToken || '',
        url: qt.accessToken ? `/quote.html?token=${qt.accessToken}` : '',
        date: formatKstDateSlice(qt.publishedAt || qt.createdAt),
        viewed: (viewsByProj.get(qt.projectId) || 0) > 0,
      });
    }
    for (const arr of quotesByProj.values()) {
      arr.sort((a, b) => b.version - a.version);
    }

    let filtered = projects.filter((p) => isPartnerAllowed(req, p, organizations));

    if (partner && partner !== 'all') {
      filtered = filtered.filter((p) => p.partnerName === partner);
    }
    if (stage && stage !== 'all') {
      filtered = filtered.filter((p) => p.status === stage);
    }
    if (product && product !== 'all') {
      filtered = filtered.filter((p) => p.product === product);
    }
    if (q && q.trim()) {
      const term = q.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.customerName || '').toLowerCase().includes(term) ||
          (p.customerPhone || '').includes(term) ||
          (p.customerAddress || '').toLowerCase().includes(term) ||
          (p.note || '').toLowerCase().includes(term) ||
          String(p.projectId).includes(term)
      );
    }
    if (period === 'today' || period === '7' || period === '30') {
      const nowMs = Date.now();
      const todayKst = formatKstDateSlice(new Date(nowMs).toISOString());
      filtered = filtered.filter((p) => {
        const pDate = formatKstDateSlice(p.createdAt);
        if (period === 'today') return pDate === todayKst;
        const days = Number(period);
        const cutoff = formatKstDateSlice(new Date(nowMs - days * 86400000).toISOString());
        return pDate >= cutoff;
      });
    }

    const customers = filtered.map((p) => {
      const pQuotes = quotesByProj.get(p.projectId) || [];
      const latestQ = pQuotes[0] || null;
      const roughQ = pQuotes.find((qt) => qt.quoteType === '가견적') || null;
      const finalQ = pQuotes.find((qt) => qt.quoteType === '최종견적') || null;
      const ll = (p.landingLinkId ? linkById.get(Number(p.landingLinkId)) : null) || linkByCode.get(p.source) || null;
      const resolvedChannel =
        p.adChannel ||
        ll?.channel ||
        (p.source === '랜딩페이지' ? '기본 랜딩(미분류)' : p.source);

      return {
        id: p.projectId,
        customerId: p.projectId,
        name: p.customerName,
        phone: p.customerPhone,
        address: p.customerAddress,
        product: p.product,
        status: p.status,
        label: p.label,
        source: p.source,
        adChannel: resolvedChannel,
        adCampaign: p.adCampaign || ll?.name || '',
        landingLinkId: p.landingLinkId || ll?.linkId || null,
        landingLinkCode: ll?.code || '',
        partner: p.partnerName,
        owner: p.ownerName,
        date: formatKstDateSlice(p.createdAt),
        note: p.note || '',
        measure: p.measureDate || '',
        build: p.buildDate || '',
        roughQuoteUrl: p.roughQuoteUrl || (roughQ ? roughQ.url : ''),
        finalQuoteUrl: p.finalQuoteUrl || (finalQ ? finalQ.url : ''),
        roughQuote: roughQ,
        finalQuote: finalQ,
        publishedQuotes: pQuotes,
        drawing: p.drawingUrl || '',
        quote: latestQ ? latestQ.totalPrice : 0,
        token: latestQ ? latestQ.token : '',
        quoteType: latestQ ? latestQ.quoteType : '가견적',
        dispatchCount: dispatchesByProj.get(p.projectId) || 0,
        viewed: (viewsByProj.get(p.projectId) || 0) > 0,
      };
    });

    if (sort === 'old') {
      customers.sort((a, b) => a.id - b.id);
    } else if (sort === 'quote') {
      customers.sort((a, b) => (b.quote || 0) - (a.quote || 0));
    } else {
      customers.sort((a, b) => b.id - a.id);
    }

    res.json({ customers });
  } catch (err) {
    console.error('[Convex] GET /api/customers error:', err);
    res.status(500).json({ error: 'Convex 서버에서 고객 목록을 불러오지 못했습니다.' });
  }
});

// 2. Get Single Customer & Project Detail (Direct from Convex Production)
router.get('/:id', requireAuth, checkPartnerAccess, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const detail = await convexClient.query(api.crm.getCustomerDetail, { projectId });

    if (!detail || !detail.project) {
      return res.status(404).json({ error: '고객 공사건을 찾을 수 없습니다.' });
    }

    const { project, notes, quotes, quoteItems, contracts, dispatches, auditLogs, landingLinks, quoteViews } = detail;

    if (!isPartnerAllowed(req, project)) {
      return res.status(403).json({ error: '해당 고객 정보에 접근 권한이 없습니다.' });
    }

    const ll =
      landingLinks.find((l) => Number(l.linkId) === Number(project.landingLinkId)) ||
      landingLinks.find((l) => l.code === project.source) ||
      null;

    const mappedNotes = notes.map((n, idx) => ({
      id: idx + 1,
      by: n.authorName,
      type: n.type,
      text: n.content,
      important: n.isImportant ? 1 : 0,
      date: formatShortKst(n.createdAt),
    }));

    const mappedQuotes = quotes.map((q) => ({
      ...q,
      id: q.version,
      project_id: q.projectId,
      quote_type: q.quoteType,
      total_price: q.totalPrice,
      access_token: q.accessToken,
      view_count: quoteViews.length,
      items: quoteItems
        .filter((it) => it.quoteVersion === q.version)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));

    const mappedHistory = auditLogs.map((h, idx) => ({
      id: idx + 1,
      by: h.userName || '관리자',
      action: h.action,
      text: h.detail || '',
      date: formatShortKst(h.createdAt),
    }));

    const mappedDispatches = dispatches.map((d, idx) => ({
      id: idx + 1,
      channel: d.channel,
      recipient_name: d.recipientName,
      recipient_phone: d.recipientPhone,
      message: d.message,
      quote_url: d.quoteUrl,
      provider: d.provider,
      status: d.status,
      sent_by: d.sentBy,
      date: formatShortKst(d.createdAt),
    }));

    res.json({
      customer: {
        id: project.projectId,
        customerId: project.projectId,
        name: project.customerName,
        phone: project.customerPhone,
        email: '',
        address: project.customerAddress,
        product: project.product,
        status: project.status,
        label: project.label,
        source: project.source,
        adChannel:
          project.adChannel ||
          ll?.channel ||
          (project.source === '랜딩페이지' ? '기본 랜딩(미분류)' : project.source),
        adCampaign: project.adCampaign || ll?.name || '',
        landingLinkId: project.landingLinkId || ll?.linkId || null,
        landingLinkCode: ll?.code || '',
        partner: project.partnerName,
        owner: project.ownerName,
        date: formatKstDateSlice(project.createdAt),
        note: project.note || '',
        description: project.description || '',
        measure: project.measureDate || '',
        build: project.buildDate || '',
        roughQuoteUrl: project.roughQuoteUrl || '',
        finalQuoteUrl: project.finalQuoteUrl || '',
        drawing: project.drawingUrl || '',
        quote: mappedQuotes[0]?.totalPrice || 0,
        token: mappedQuotes[0]?.accessToken || '',
        quoteType: mappedQuotes[0]?.quoteType || '가견적',
        viewed: quoteViews.length > 0,
      },
      notes: mappedNotes.filter((n) => n.type === 'notes'),
      feedback: mappedNotes.filter((n) => n.type === 'feedback'),
      quotes: mappedQuotes,
      contracts,
      history: mappedHistory,
      sources: [],
      dispatches: mappedDispatches,
    });
  } catch (err) {
    console.error('[Convex] GET /api/customers/:id error:', err);
    res.status(500).json({ error: 'Convex 서버에서 상세 정보를 불러오지 못했습니다.' });
  }
});

// 3. Create Customer & First Project (Direct to Convex Production)
router.post('/', requireAuth, checkPartnerAccess, async (req, res) => {
  try {
    const { name, phone, address, product, owner, partner, source, adCampaign, landingLinkId, note } = req.body;

    if (!name || !phone || !address) {
      return res.status(400).json({ error: '고객명, 연락처, 공사 주소는 필수입니다.' });
    }

    let partnerName = partner || '직영';
    let targetOrgId = 1;
    if (req.partnerOrgId) {
      targetOrgId = req.partnerOrgId;
      partnerName = req.user.org_name || partnerName;
    }

    const result = await convexClient.mutation(api.crm.createCustomerProject, {
      name,
      phone,
      address,
      product: product || '창호',
      owner: owner || '미배정',
      partner: partnerName,
      orgId: targetOrgId,
      source: source || '직접등록',
      adCampaign: adCampaign || undefined,
      landingLinkId: landingLinkId ? Number(landingLinkId) : undefined,
      note: note || '',
      authorName: req.user?.name || '관리자',
    });

    res.status(201).json({ id: result.projectId, message: '고객이 Convex 운영 서버에 등록되었습니다.' });
  } catch (err) {
    console.error('[Convex] POST /api/customers error:', err);
    res.status(500).json({ error: 'Convex 서버에 고객을 등록하지 못했습니다.' });
  }
});

// 4. Update Customer / Project Status, Label, Owner, Schedule, Drawing (Direct to Convex Production)
router.patch('/:id', requireAuth, checkPartnerAccess, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { status, label, owner, source, adCampaign, measure, build, roughQuoteUrl, finalQuoteUrl, drawing, description } = req.body;

    const result = await convexClient.mutation(api.crm.updateProject, {
      projectId,
      status,
      label,
      owner,
      source,
      adCampaign,
      measure,
      build,
      roughQuoteUrl,
      finalQuoteUrl,
      drawing,
      description,
      userName: req.user?.name || '관리자',
    });

    if (!result.found) {
      return res.status(404).json({ error: '고객 공사건을 찾을 수 없습니다.' });
    }

    res.json({ message: 'Convex 운영 서버에 성공적으로 저장되었습니다.' });
  } catch (err) {
    console.error('[Convex] PATCH /api/customers/:id error:', err);
    res.status(500).json({ error: 'Convex 서버 저장 중 오류가 발생했습니다.' });
  }
});

// 5. Add Consultation Note or Feedback (Direct to Convex Production)
router.post('/:id/notes', requireAuth, checkPartnerAccess, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { type, note, important } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ error: '내용을 입력해 주세요.' });
    }

    const result = await convexClient.mutation(api.crm.addConsultationNote, {
      projectId,
      authorName: req.user?.name || '관리자',
      type: type === 'feedback' ? 'feedback' : 'notes',
      content: note.trim(),
      isImportant: Boolean(important),
    });

    if (!result.found) {
      return res.status(404).json({ error: '고객 공사건을 찾을 수 없습니다.' });
    }

    res.status(201).json({ message: '기록이 Convex 운영 서버에 등록되었습니다.' });
  } catch (err) {
    console.error('[Convex] POST /api/customers/:id/notes error:', err);
    res.status(500).json({ error: 'Convex 서버에 상담 이력을 저장하지 못했습니다.' });
  }
});

export default router;
