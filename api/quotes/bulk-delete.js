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
  const rawItems = Array.isArray(body?.items) ? body.items : [];
  const items = rawItems
    .map((it) => ({
      projectId: parseInt(it?.projectId, 10),
      version: parseInt(it?.version, 10),
    }))
    .filter((it) => Number.isFinite(it.projectId) && it.projectId > 0 && Number.isFinite(it.version) && it.version > 0);

  if (items.length === 0) {
    return res.status(400).json({ error: "삭제할 견적 버전 목록이 필요합니다." });
  }

  try {
    let allowedItems = items;
    if (auth.user.role === "partner") {
      const data = await convexClient.query(api.crm.listCustomersData, {});
      const { projects, organizations } = data;
      const projMap = new Map(projects.map((p) => [Number(p.projectId), p]));
      allowedItems = items.filter((it) => {
        const proj = projMap.get(it.projectId);
        return proj && isPartnerAllowed(auth, proj, organizations);
      });
      if (allowedItems.length === 0) {
        return res.status(403).json({ error: "선택한 견적서를 삭제할 권한이 없습니다." });
      }
    }

    const result = await convexClient.mutation(api.quotes.deleteProjectQuotes, {
      items: allowedItems,
      userName: auth.user.name || "관리자",
    });

    return res.status(200).json({
      success: true,
      deleted: result?.deleted ?? allowedItems.length,
      deletedItems: allowedItems,
    });
  } catch (err) {
    console.error("Vercel POST /api/quotes/bulk-delete error:", err);
    return res.status(500).json({ error: "견적서 삭제 중 오류가 발생했습니다." });
  }
}
