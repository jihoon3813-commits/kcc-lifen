import { api } from "../../../convex/_generated/api.js";
import { convexClient, setCors, parseBody } from "../../_lib/authHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const rawToken = Array.isArray(req.query?.token) ? req.query.token[0] : req.query?.token;
  const supToken = String(rawToken || "").trim();
  if (!supToken) {
    return res.status(400).json({ error: "보완 요청 토큰이 필요합니다." });
  }

  try {
    const setting = await convexClient.query(api.settings.getSetting, {
      key: `supplement_${supToken}`,
    });
    if (!setting) {
      return res.status(404).json({ error: "유효하지 않거나 만료된 보완 요청 링크입니다." });
    }
    const info = JSON.parse(setting.value);

    if (req.method === "GET") {
      return res.status(200).json({
        token: supToken,
        appNo: info.appNo,
        customerName: info.customerName,
        reason: info.reason,
        createdAt: info.createdAt,
      });
    }

    if (req.method === "POST") {
      const body = parseBody(req) || {};
      await convexClient.mutation(api.rentals.updateReview, {
        appNo: info.appNo,
        status: "reviewing",
        underwritingMemo: `고객 보완 서류 제출 완료 (${body.memo || "첨부 확인"})`,
      });
      return res.status(200).json({
        success: true,
        message: "보완 서류가 정상적으로 제출되었습니다.",
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[Vercel Convex] /api/rental/supplement/[token] error:", err);
    return res.status(500).json({ error: "보완 서류 처리 중 오류가 발생했습니다." });
  }
}
