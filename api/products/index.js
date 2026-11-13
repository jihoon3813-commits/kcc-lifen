import { api } from "../../convex/_generated/api.js";
import { convexClient, setCors, authenticateRequest } from "../_lib/authHelper.js";
import { formatProductsAndLinks } from "../_lib/productHelper.js";

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
    const data = await convexClient.query(api.crm.listProductsAndLinks, {});
    return res.status(200).json(formatProductsAndLinks(data, auth.user));
  } catch (err) {
    console.error("[Vercel Convex] GET /api/products error:", err);
    return res.status(500).json({ error: "상품 및 광고링크 조회 중 오류가 발생했습니다." });
  }
}
