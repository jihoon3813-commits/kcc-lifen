import { api } from "../../../convex/_generated/api.js";
import { convexClient, setCors } from "../../_lib/authHelper.js";
import { maskName, maskPhone } from "../../../server/utils/mobileQuoteFormatter.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = String(req.query.token || "").trim();
  if (!token) {
    return res.status(400).json({ error: "견적서 토큰이 필요합니다." });
  }

  try {
    const bundle = await convexClient.query(api.quotes.getPublicBundleByToken, {
      accessToken: token,
    });

    if (!bundle) {
      return res.status(404).json({ error: "유효한 견적서 링크가 아니거나 만료되었습니다." });
    }

    return res.json({
      requires_login: true,
      requires_verification: true,
      masked_name: maskName(bundle.project.customerName),
      masked_phone: maskPhone(bundle.project.customerPhone),
      title: bundle.quote.title,
      quote_type: bundle.quote.quoteType || "가견적",
      product: bundle.project.product || "창호",
      published_at: bundle.quote.publishedAt || bundle.quote.createdAt || "",
    });
  } catch (err) {
    console.error("[Vercel Convex] GET /api/public/quotes/[token] error:", err);
    return res.status(500).json({ error: "견적서 정보를 불러오지 못했습니다." });
  }
}
