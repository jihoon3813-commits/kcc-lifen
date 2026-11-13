import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  authenticateRequest,
} from "../_lib/authHelper.js";
import { isPartnerAllowed, formatKstDateSlice } from "../_lib/crmHelper.js";

function inPeriod(isoStr, period) {
  if (period === "all") return true;
  const dateStr = formatKstDateSlice(isoStr);
  if (!dateStr) return false;
  const nowKst = formatKstDateSlice(new Date().toISOString());
  if (period === "1") return dateStr === nowKst;
  const days = Math.max(1, parseInt(period, 10) || 30);
  const cutoff = formatKstDateSlice(new Date(Date.now() - (days - 1) * 86400000).toISOString());
  return dateStr >= cutoff;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }

  try {
    const rawPeriod = String(req.query?.period || "30");
    const period = ["all", "1", "7", "30"].includes(rawPeriod) ? rawPeriod : "30";

    const [analytics, custData] = await Promise.all([
      convexClient.query(api.crm.getAnalyticsData, {}),
      convexClient.query(api.crm.listCustomersData, {}),
    ]);

    const { projects: allProjects, landingEvents: allEvents, landingLinks: allLinks, contracts: allContracts } = analytics;
    const { quotes: publishedQuotes, quoteViews, organizations } = custData;

    const projects = allProjects.filter((p) => isPartnerAllowed(auth, p, organizations) && inPeriod(p.createdAt, period));
    const projectIds = new Set(projects.map((p) => p.projectId));
    const events = allEvents.filter((e) => inPeriod(e.createdAt, period));
    const contracts = allContracts.filter((c) => projectIds.has(c.projectId));
    const quotedProjectIds = new Set(publishedQuotes.filter((q) => projectIds.has(q.projectId)).map((q) => q.projectId));
    const viewedProjectIds = new Set(quoteViews.filter((v) => quotedProjectIds.has(v.projectId)).map((v) => v.projectId));

    const trendDays = period === "1" ? 1 : period === "7" ? 7 : 14;
    const trend = [];
    for (let i = trendDays - 1; i >= 0; i--) {
      const day = formatKstDateSlice(new Date(Date.now() - i * 86400000).toISOString());
      trend.push({
        day,
        views: allEvents.filter((e) => e.eventType === "page_view" && formatKstDateSlice(e.createdAt) === day).length,
        leads: allProjects.filter((p) => isPartnerAllowed(auth, p, organizations) && formatKstDateSlice(p.createdAt) === day).length,
      });
    }

    const channelMap = new Map();
    for (const p of projects) {
      const ch = p.adChannel || p.source || "기본 랜딩(직접유입)";
      if (!channelMap.has(ch)) channelMap.set(ch, { channel: ch, views: 0, leads: 0, quotes: 0, contracts: 0 });
      const entry = channelMap.get(ch);
      entry.leads += 1;
      if (quotedProjectIds.has(p.projectId)) entry.quotes += 1;
      if (contracts.some((c) => c.projectId === p.projectId)) entry.contracts += 1;
    }

    return res.status(200).json({
      period,
      summary: {
        totalViews: events.filter((e) => e.eventType === "page_view").length,
        totalCustomers: projects.length,
        quotedCustomers: quotedProjectIds.size,
        viewedCustomers: viewedProjectIds.size,
        totalContracts: contracts.length,
        paidContracts: contracts.filter((c) => c.status === "signed" || c.status === "completed").length,
        totalRevenue: contracts.filter((c) => c.status !== "cancelled").reduce((s, c) => s + Number(c.totalAmount || 0), 0),
      },
      trend,
      channels: Array.from(channelMap.values()).map((c) => ({
        ...c,
        conversionRate: c.views > 0 ? Number(((c.leads / c.views) * 100).toFixed(1)) : 0,
      })),
      landingLinks: allLinks.map((ll) => ({
        id: ll.linkId,
        code: ll.code,
        name: ll.name,
        channel: ll.channel,
        partnerName: ll.partnerName || "직영",
        targetUrl: ll.targetUrl || "/landing/",
        isActive: Boolean(ll.active),
        views: ll.clicks || 0,
        leads: projects.filter((p) => Number(p.landingLinkId) === Number(ll.linkId) || p.source === ll.code).length,
        quotes: 0,
        contracts: 0,
        conversionRate: 0,
      })),
      products: [],
      recentEvents: allEvents.slice(-20).reverse().map((ev, idx) => ({
        id: idx + 1,
        createdAt: ev.createdAt,
        productName: ev.productName || "KCC 홈씨씨 창호",
        channel: ev.channel || "직접 방문",
        campaignName: ev.campaignName || ev.utmCampaign || "",
        partnerName: ev.partnerName || "직영",
        ipMasked: "-",
        device: "웹",
        eventType: ev.eventType,
        eventLabel: ev.eventType === "page_view" ? "페이지 방문" : ev.eventType,
      })),
    });
  } catch (err) {
    console.error("Vercel GET /api/analytics/overview error:", err);
    return res.status(500).json({ error: "Convex 분석 데이터를 불러오지 못했습니다." });
  }
}
