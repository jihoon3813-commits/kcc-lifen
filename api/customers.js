import { api } from "../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
} from "./_lib/authHelper.js";
import { isPartnerAllowed, formatKstDateSlice } from "./_lib/crmHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }

  if (req.method === "GET") {
    try {
      const { q, stage, product, partner, period, sort } = req.query || {};
      const data = await convexClient.query(api.crm.listCustomersData, {});
      const { projects, quotes, landingLinks, quoteViews, quoteDispatches, organizations } = data;

      const linkById = new Map(landingLinks.map((l) => [Number(l.linkId), l]));
      const linkByCode = new Map(landingLinks.map((l) => [l.code, l]));

      const viewsByProj = new Map();
      for (const v of quoteViews) {
        viewsByProj.set(v.projectId, (viewsByProj.get(v.projectId) || 0) + 1);
      }
      const dispatchesByProj = new Map();
      for (const d of quoteDispatches) {
        dispatchesByProj.set(d.projectId, (dispatchesByProj.get(d.projectId) || 0) + 1);
      }

      const quotesByProj = new Map();
      for (const qt of quotes) {
        if (!quotesByProj.has(qt.projectId)) quotesByProj.set(qt.projectId, []);
        quotesByProj.get(qt.projectId).push({
          id: qt.version,
          version: qt.version,
          title: qt.title,
          quoteType: qt.quoteType || "가견적",
          totalPrice: qt.totalPrice,
          discountAmount: qt.discountAmount || 0,
          token: qt.accessToken || "",
          url: qt.accessToken ? `/quote.html?token=${qt.accessToken}` : "",
          date: formatKstDateSlice(qt.publishedAt || qt.createdAt),
          viewed: (viewsByProj.get(qt.projectId) || 0) > 0,
        });
      }
      for (const arr of quotesByProj.values()) {
        arr.sort((a, b) => b.version - a.version);
      }

      let filtered = projects.filter((p) => isPartnerAllowed(auth, p, organizations));
      if (partner && partner !== "all") {
        filtered = filtered.filter((p) => p.partnerName === partner);
      }
      if (stage && stage !== "all") {
        filtered = filtered.filter((p) => p.status === stage);
      }
      if (product && product !== "all") {
        filtered = filtered.filter((p) => p.product === product);
      }
      if (q && String(q).trim()) {
        const term = String(q).trim().toLowerCase();
        filtered = filtered.filter(
          (p) =>
            (p.customerName || "").toLowerCase().includes(term) ||
            (p.customerPhone || "").includes(term) ||
            (p.customerAddress || "").toLowerCase().includes(term) ||
            (p.note || "").toLowerCase().includes(term) ||
            String(p.projectId).includes(term)
        );
      }
      if (period === "today" || period === "7" || period === "30") {
        const nowMs = Date.now();
        const todayKst = formatKstDateSlice(new Date(nowMs).toISOString());
        filtered = filtered.filter((p) => {
          const pDate = formatKstDateSlice(p.createdAt);
          if (period === "today") return pDate === todayKst;
          const days = Number(period);
          const cutoff = formatKstDateSlice(new Date(nowMs - days * 86400000).toISOString());
          return pDate >= cutoff;
        });
      }

      const customers = filtered.map((p) => {
        const pQuotes = quotesByProj.get(p.projectId) || [];
        const latestQ = pQuotes[0] || null;
        const roughQ = pQuotes.find((qt) => qt.quoteType === "가견적") || null;
        const finalQ = pQuotes.find((qt) => qt.quoteType === "최종견적") || null;
        const ll =
          (p.landingLinkId ? linkById.get(Number(p.landingLinkId)) : null) ||
          linkByCode.get(p.source) ||
          null;
        const resolvedChannel =
          p.adChannel ||
          ll?.channel ||
          (p.source === "랜딩페이지" ? "기본 랜딩(미분류)" : p.source);

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
          adCampaign: p.adCampaign || ll?.name || "",
          landingLinkId: p.landingLinkId || ll?.linkId || null,
          landingLinkCode: ll?.code || "",
          partner: p.partnerName,
          owner: p.ownerName,
          date: formatKstDateSlice(p.createdAt),
          createdAt: p.createdAt || "",
          updatedAt: p.updatedAt || "",
          note: p.note || "",
          measure: p.measureDate || "",
          build: p.buildDate || "",
          roughQuoteUrl: p.roughQuoteUrl || (roughQ ? roughQ.url : ""),
          finalQuoteUrl: p.finalQuoteUrl || (finalQ ? finalQ.url : ""),
          roughQuote: roughQ,
          finalQuote: finalQ,
          publishedQuotes: pQuotes,
          drawing: p.drawingUrl || "",
          quote: latestQ ? latestQ.totalPrice : 0,
          token: latestQ ? latestQ.token : "",
          quoteType: latestQ ? latestQ.quoteType : "가견적",
          dispatchCount: dispatchesByProj.get(p.projectId) || 0,
          viewed: (viewsByProj.get(p.projectId) || 0) > 0,
        };
      });

      if (sort === "old") {
        customers.sort((a, b) => a.id - b.id);
      } else if (sort === "quote") {
        customers.sort((a, b) => (b.quote || 0) - (a.quote || 0));
      } else {
        customers.sort((a, b) => b.id - a.id);
      }

      return res.status(200).json({ customers });
    } catch (err) {
      console.error("Vercel GET /api/customers error:", err);
      return res.status(500).json({ error: "Convex 서버에서 고객 목록을 불러오지 못했습니다." });
    }
  }

  if (req.method === "POST") {
    const body = parseBody(req);
    if (!body) return res.status(400).json({ error: "올바르지 않은 JSON 데이터입니다." });

    const { name, phone, address, product, owner, partner, source, adCampaign, landingLinkId, note } = body;
    if (!name || !phone || !address) {
      return res.status(400).json({ error: "고객명, 연락처, 공사 주소는 필수입니다." });
    }

    try {
      let partnerName = partner || "직영";
      let targetOrgId = 1;
      if (auth.user.role === "partner") {
        targetOrgId = auth.user.org_id || 1;
        partnerName = auth.user.org_name || partnerName;
      }

      const result = await convexClient.mutation(api.crm.createCustomerProject, {
        name: String(name),
        phone: String(phone),
        address: String(address),
        product: product ? String(product) : "창호",
        owner: owner ? String(owner) : "미배정",
        partner: partnerName,
        orgId: targetOrgId,
        source: source ? String(source) : "직접등록",
        adCampaign: adCampaign ? String(adCampaign) : undefined,
        landingLinkId: landingLinkId ? Number(landingLinkId) : undefined,
        note: note ? String(note) : "",
        authorName: auth.user.name || "관리자",
      });

      return res.status(201).json({
        id: result.projectId,
        message: "고객이 Convex 운영 서버에 등록되었습니다.",
      });
    } catch (err) {
      console.error("Vercel POST /api/customers error:", err);
      return res.status(500).json({ error: "Convex 서버에 고객을 등록하지 못했습니다." });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
