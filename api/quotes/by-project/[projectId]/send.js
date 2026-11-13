import { api } from "../../../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
} from "../../../_lib/authHelper.js";
import { sendProjectQuoteViaConvex } from "../../../../server/utils/quoteService.js";

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
    const projectId = parseInt(req.query.projectId, 10);
    if (Number.isNaN(projectId)) {
      return res.status(400).json({ error: "유효하지 않은 공사건 ID입니다." });
    }

    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "";
    const baseOrigin = host ? `${proto}://${host}` : "";

    const msgCfg = {
      enabled: Boolean(process.env.SMS_WEBHOOK_URL || process.env.KAKAO_WEBHOOK_URL),
      provider: "webhook",
      senderPhone: process.env.SMS_SENDER_PHONE || "1588-0000",
      smsWebhookUrl: process.env.SMS_WEBHOOK_URL || "",
      kakaoWebhookUrl: process.env.KAKAO_WEBHOOK_URL || "",
      apiKey: process.env.MESSAGING_API_KEY || "",
      kakaoPfId: process.env.KAKAO_PF_ID || "",
    };

    const result = await sendProjectQuoteViaConvex(convexClient, api, {
      projectId,
      body,
      user: auth.user,
      partnerOrgId: auth.partnerOrgId,
      baseOrigin,
      msgCfg,
    });
    return res.status(result.status).json(result.data);
  } catch (err) {
    console.error("[Vercel Convex] POST /api/quotes/by-project/[projectId]/send error:", err);
    return res.status(500).json({ error: "견적서 발송 처리 중 오류가 발생했습니다." });
  }
}
