import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
} from "../_lib/authHelper.js";
import { isPartnerAllowed } from "../_lib/crmHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }

  const body = parseBody(req);
  const rawIds = Array.isArray(body?.ids) ? body.ids : [];
  const projectIds = [...new Set(rawIds.map((id) => parseInt(id, 10)).filter((n) => Number.isFinite(n) && n > 0))];
  if (projectIds.length === 0) {
    return res.status(400).json({ error: "삭제할 고객 ID 목록이 필요합니다." });
  }

  try {
    let allowedIds = projectIds;
    if (auth.user.role === "partner") {
      const data = await convexClient.query(api.crm.listCustomersData, {});
      const { projects, organizations } = data;
      const projMap = new Map(projects.map((p) => [Number(p.projectId), p]));
      allowedIds = projectIds.filter((id) => {
        const proj = projMap.get(id);
        return proj && isPartnerAllowed(auth, proj, organizations);
      });
      if (allowedIds.length === 0) {
        return res.status(403).json({ error: "선택한 고객을 삭제할 권한이 없습니다." });
      }
    }

    const result = await convexClient.mutation(api.crm.deleteProjects, {
      projectIds: allowedIds,
    });
    return res.status(200).json({
      success: true,
      deleted: result?.deleted ?? allowedIds.length,
      deletedIds: allowedIds,
    });
  } catch (err) {
    console.error("Vercel POST /api/customers/bulk-delete error:", err);
    return res.status(500).json({ error: "고객 일괄 삭제 중 오류가 발생했습니다." });
  }
}
