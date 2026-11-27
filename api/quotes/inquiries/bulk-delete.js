import { api } from "../../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
} from "../../_lib/authHelper.js";
import { isPartnerAllowed } from "../../_lib/crmHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }

  const body = parseBody(req);
  const rawIds = Array.isArray(body?.projectIds) ? body.projectIds : [];
  const projectIds = [...new Set(rawIds.map((id) => parseInt(id, 10)).filter((id) => Number.isFinite(id) && id > 0))];

  if (projectIds.length === 0) {
    return res.status(400).json({ error: "삭제할 견적 문의 고객 ID 목록이 필요합니다." });
  }

  try {
    let allowedIds = projectIds;
    if (auth.user.role === "partner") {
      const data = await convexClient.query(api.crm.listCustomersData, {});
      const { projects, organizations } = data;
      const projMap = new Map(projects.map((p) => [Number(p.projectId), p]));
      allowedIds = projectIds.filter((pid) => {
        const proj = projMap.get(pid);
        return proj && isPartnerAllowed(auth, proj, organizations);
      });
      if (allowedIds.length === 0) {
        return res.status(403).json({ error: "선택한 견적 문의를 삭제할 권한이 없습니다." });
      }
    }

    const result = await convexClient.mutation(api.quotes.deleteQuoteInquiries, {
      projectIds: allowedIds,
      userName: auth.user.name || "관리자",
    });

    return res.status(200).json({
      success: true,
      deleted: result?.deleted ?? 0,
      deletedProjectIds: allowedIds,
    });
  } catch (err) {
    console.error("Vercel POST /api/quotes/inquiries/bulk-delete error:", err);
    return res.status(500).json({ error: "견적 문의 삭제 중 오류가 발생했습니다." });
  }
}
