import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
} from "../_lib/authHelper.js";
import { createQuoteInConvex } from "../../server/utils/quoteService.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }

  const body = parseBody(req);
  if (!body) {
    return res.status(400).json({ error: "요청 본문이 올바르지 않습니다." });
  }

  try {
    const result = await createQuoteInConvex(convexClient, api, {
      body,
      user: auth.user,
      partnerOrgId: auth.partnerOrgId,
    });
    return res.status(result.status).json(result.data);
  } catch (err) {
    console.error("[Vercel Convex] POST /api/quotes error:", err);
    return res.status(500).json({ error: "견적서 저장 중 오류가 발생했습니다." });
  }
}
