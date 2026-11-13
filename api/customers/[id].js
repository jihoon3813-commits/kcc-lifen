import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
} from "../_lib/authHelper.js";
import { isPartnerAllowed, formatKstDateSlice, formatShortKst, resolveProjectAttribution } from "../_lib/crmHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }

  const projectId = parseInt(req.query?.id, 10);
  if (!projectId || Number.isNaN(projectId)) {
    return res.status(400).json({ error: "유효하지 않은 프로젝트 ID입니다." });
  }

  if (req.method === "GET") {
    try {
      const detail = await convexClient.query(api.crm.getCustomerDetail, { projectId });
      if (!detail || !detail.project) {
        return res.status(404).json({ error: "고객 공사건을 찾을 수 없습니다." });
      }

      const { project, notes, quotes, quoteItems, contracts, dispatches, auditLogs, landingLinks, quoteViews } = detail;
      if (!isPartnerAllowed(auth, project)) {
        return res.status(403).json({ error: "해당 고객 정보에 접근 권한이 없습니다." });
      }

      const linkById = new Map(landingLinks.map((l) => [Number(l.linkId), l]));
      const linkByCode = new Map(landingLinks.map((l) => [l.code, l]));
      const attr = resolveProjectAttribution(project, linkById, linkByCode);

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
        by: h.userName || "관리자",
        action: h.action,
        text: h.detail || "",
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

      return res.status(200).json({
        customer: {
          id: project.projectId,
          customerId: project.projectId,
          name: project.customerName,
          phone: project.customerPhone,
          email: "",
          address: project.customerAddress,
          product: project.product,
          status: project.status,
          label: project.label,
          source: project.source,
          adChannel: attr.adChannel,
          adCampaign: attr.adCampaign,
          landingLinkId: attr.landingLinkId,
          landingLinkCode: attr.landingLinkCode,
          partner: project.partnerName,
          owner: project.ownerName,
          date: formatKstDateSlice(project.createdAt),
          note: project.note || "",
          description: project.description || "",
          measure: project.measureDate || "",
          build: project.buildDate || "",
          roughQuoteUrl: project.roughQuoteUrl || "",
          finalQuoteUrl: project.finalQuoteUrl || "",
          drawing: project.drawingUrl || "",
          quote: mappedQuotes[0]?.totalPrice || 0,
          token: mappedQuotes[0]?.accessToken || "",
          quoteType: mappedQuotes[0]?.quoteType || "가견적",
          viewed: quoteViews.length > 0,
        },
        notes: mappedNotes.filter((n) => n.type === "notes"),
        feedback: mappedNotes.filter((n) => n.type === "feedback"),
        quotes: mappedQuotes,
        contracts,
        history: mappedHistory,
        sources: [],
        dispatches: mappedDispatches,
      });
    } catch (err) {
      console.error("Vercel GET /api/customers/[id] error:", err);
      return res.status(500).json({ error: "Convex 서버에서 상세 정보를 불러오지 못했습니다." });
    }
  }

  if (req.method === "PATCH") {
    const body = parseBody(req);
    if (!body) return res.status(400).json({ error: "올바르지 않은 JSON 데이터입니다." });

    try {
      const { status, label, owner, source, adCampaign, measure, build, roughQuoteUrl, finalQuoteUrl, drawing, description } = body;
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
        userName: auth.user.name || "관리자",
      });

      if (!result.found) {
        return res.status(404).json({ error: "고객 공사건을 찾을 수 없습니다." });
      }
      return res.status(200).json({ message: "Convex 운영 서버에 성공적으로 저장되었습니다." });
    } catch (err) {
      console.error("Vercel PATCH /api/customers/[id] error:", err);
      return res.status(500).json({ error: "Convex 서버 저장 중 오류가 발생했습니다." });
    }
  }

  if (req.method === "DELETE") {
    try {
      const detail = await convexClient.query(api.crm.getCustomerDetail, { projectId });
      if (!detail || !detail.project) {
        return res.status(404).json({ error: "고객 공사건을 찾을 수 없습니다." });
      }
      if (!isPartnerAllowed(auth, detail.project)) {
        return res.status(403).json({ error: "해당 고객을 삭제할 권한이 없습니다." });
      }
      const result = await convexClient.mutation(api.crm.deleteProjects, {
        projectIds: [projectId],
      });
      return res.status(200).json({ success: true, deleted: result?.deleted || 1 });
    } catch (err) {
      console.error("Vercel DELETE /api/customers/[id] error:", err);
      return res.status(500).json({ error: "고객 삭제 중 오류가 발생했습니다." });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
