import express from 'express';
import { convexClient, api } from '../convex.js';
import { requireAuth, checkPartnerAccess } from '../middleware/auth.js';

const router = express.Router();

function toKstDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return String(isoStr).slice(0, 10);
  return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function inPeriod(isoStr, period) {
  if (period === 'all') return true;
  const dateStr = toKstDate(isoStr);
  if (!dateStr) return false;
  const nowKst = toKstDate(new Date().toISOString());
  if (period === '1') return dateStr === nowKst;
  const days = Math.max(1, parseInt(period, 10) || 30);
  const cutoff = toKstDate(new Date(Date.now() - (days - 1) * 86400000).toISOString());
  return dateStr >= cutoff;
}

router.get('/overview', requireAuth, checkPartnerAccess, async (req, res) => {
  try {
    const rawPeriod = String(req.query.period || '30');
    const period = ['all', '1', '7', '30'].includes(rawPeriod) ? rawPeriod : '30';

    const [analytics, custData] = await Promise.all([
      convexClient.query(api.crm.getAnalyticsData, {}),
      convexClient.query(api.crm.listCustomersData, {}),
    ]);

    const { projects: allProjects, landingEvents: allEvents, landingLinks: allLinks, contracts: allContracts } = analytics;
    const { quotes: publishedQuotes, quoteViews, organizations } = custData;

    const partnerNameFilter = req.partnerOrgId
      ? (() => {
          const allowed = new Set();
          const mainOrg = organizations.find((o) => Number(o.orgId) === Number(req.partnerOrgId));
          if (mainOrg) allowed.add(mainOrg.name);
          if (req.user?.org_name) allowed.add(req.user.org_name);
          for (const o of organizations) {
            if (Number(o.parentId) === Number(req.partnerOrgId)) allowed.add(o.name);
          }
          return allowed;
        })()
      : null;

    const projects = allProjects.filter((p) => {
      if (partnerNameFilter && !partnerNameFilter.has(p.partnerName)) return false;
      return inPeriod(p.createdAt, period);
    });

    const events = allEvents.filter((e) => {
      if (partnerNameFilter && !partnerNameFilter.has(e.partnerName)) return false;
      return inPeriod(e.createdAt, period);
    });

    const projectIds = new Set(projects.map((p) => p.projectId));
    const contracts = allContracts.filter((c) => projectIds.has(c.projectId) || (!partnerNameFilter && inPeriod(c.createdAt, period)));
    const quotedProjectIds = new Set(publishedQuotes.filter((q) => projectIds.has(q.projectId)).map((q) => q.projectId));
    const viewedProjectIds = new Set(quoteViews.filter((v) => quotedProjectIds.has(v.projectId)).map((v) => v.projectId));

    const totalViews = events.filter((e) => e.eventType === 'page_view').length;
    const totalCustomers = projects.length;
    const quotedCustomers = quotedProjectIds.size;
    const viewedCustomers = viewedProjectIds.size;
    const totalContracts = contracts.length;
    const paidContracts = contracts.filter((c) => c.status === 'signed' || c.status === 'completed').length;
    const totalRevenue = contracts
      .filter((c) => c.status !== 'cancelled')
      .reduce((sum, c) => sum + Number(c.totalAmount || 0), 0);

    // Trend (last 7 or 14 days)
    const trendDays = period === '1' ? 1 : period === '7' ? 7 : 14;
    const trend = [];
    for (let i = trendDays - 1; i >= 0; i--) {
      const day = toKstDate(new Date(Date.now() - i * 86400000).toISOString());
      trend.push({
        day,
        views: allEvents.filter((e) => e.eventType === 'page_view' && toKstDate(e.createdAt) === day).length,
        leads: allProjects.filter((p) => toKstDate(p.createdAt) === day && (!partnerNameFilter || partnerNameFilter.has(p.partnerName))).length,
      });
    }

    // Channels breakdown
    const channelMap = new Map();
    for (const p of projects) {
      const ch = p.adChannel || p.source || '기본 랜딩(직접유입)';
      if (!channelMap.has(ch)) {
        channelMap.set(ch, { channel: ch, views: 0, leads: 0, quotes: 0, contracts: 0 });
      }
      const entry = channelMap.get(ch);
      entry.leads += 1;
      if (quotedProjectIds.has(p.projectId)) entry.quotes += 1;
      if (contracts.some((c) => c.projectId === p.projectId)) entry.contracts += 1;
    }
    for (const e of events) {
      if (e.eventType !== 'page_view') continue;
      const ch = e.channel || '기본 랜딩(직접유입)';
      if (!channelMap.has(ch)) {
        channelMap.set(ch, { channel: ch, views: 0, leads: 0, quotes: 0, contracts: 0 });
      }
      channelMap.get(ch).views += 1;
    }
    const channels = Array.from(channelMap.values()).map((c) => ({
      ...c,
      conversionRate: c.views > 0 ? Number(((c.leads / c.views) * 100).toFixed(1)) : 0,
    }));

    const landingLinks = allLinks.map((ll) => {
      const linkProjs = projects.filter((p) => Number(p.landingLinkId) === Number(ll.linkId) || p.source === ll.code);
      const views = events.filter((e) => Number(e.landingLinkId) === Number(ll.linkId) && e.eventType === 'page_view').length || ll.clicks || 0;
      const leads = linkProjs.length;
      const quotes = linkProjs.filter((p) => quotedProjectIds.has(p.projectId)).length;
      const linkContracts = linkProjs.filter((p) => contracts.some((c) => c.projectId === p.projectId)).length;
      return {
        id: ll.linkId,
        code: ll.code,
        name: ll.name,
        channel: ll.channel,
        medium: '',
        productName: 'KCC 홈씨씨 창호',
        productCategory: '창호',
        partnerName: ll.partnerName || '직영',
        targetUrl: ll.targetUrl || '/landing/',
        isActive: Boolean(ll.active),
        views,
        leads,
        quotes,
        contracts: linkContracts,
        conversionRate: views > 0 ? Number(((leads / views) * 100).toFixed(1)) : 0,
      };
    });

    const recentEvents = allEvents
      .filter((e) => !partnerNameFilter || partnerNameFilter.has(e.partnerName))
      .slice(-20)
      .reverse()
      .map((ev, idx) => ({
        id: idx + 1,
        createdAt: ev.createdAt,
        productName: ev.productName || 'KCC 홈씨씨 창호',
        channel: ev.channel || '직접 방문',
        campaignName: ev.campaignName || ev.utmCampaign || '',
        partnerName: ev.partnerName || '직영',
        ipMasked: '-',
        device: '웹',
        eventType: ev.eventType,
        eventLabel: ev.eventType === 'page_view' ? '페이지 방문' : ev.eventType,
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
        totalRevenue,
      },
      trend,
      channels,
      landingLinks,
      products: [],
      recentEvents,
    });
  } catch (err) {
    console.error('[Convex] Analytics overview error:', err);
    res.status(500).json({ error: 'Convex 분석 데이터를 불러오지 못했습니다.' });
  }
});

export default router;
