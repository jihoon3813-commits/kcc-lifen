import { api } from "../../../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  authenticateRequest,
} from "../../../_lib/authHelper.js";
import { getProjectQuotePreviewFromConvex } from "../../../../server/utils/quoteService.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }

  try {
    const projectId = parseInt(req.query.projectId, 10);
    if (Number.isNaN(projectId)) {
      return res.status(400).json({ error: "유효하지 않은 공사건 ID입니다." });
    }

    const requestedType = req.query.type ? String(req.query.type).trim() : "";
    const requestedQuoteId = req.query.quoteId ? parseInt(req.query.quoteId, 10) : null;
    const allowSimulate = req.query.simulate !== "0";

    const result = await getProjectQuotePreviewFromConvex(convexClient, api, {
      projectId,
      requestedType,
      requestedQuoteId,
      allowSimulate,
      partnerOrgId: auth.partnerOrgId,
      user: auth.user,
      messagingLive: Boolean(process.env.SMS_WEBHOOK_URL || process.env.KAKAO_WEBHOOK_URL),
    });
    return res.status(result.status).json(result.data);
  } catch (err) {
    console.error("[Vercel Convex] GET /api/quotes/by-project/[projectId]/preview error:", err);
    return res.status(500).json({ error: "견적 미리보기를 불러오지 못했습니다." });
  }
}
