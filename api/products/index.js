import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
} from "../_lib/authHelper.js";
import {
  formatProductsAndLinks,
  ensureDefaultProductsInConvex,
} from "../_lib/productHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }

  if (req.method === "GET") {
    try {
      let data = await convexClient.query(api.crm.listProductsAndLinks, {});
      if (!data?.products?.length) {
        await ensureDefaultProductsInConvex(convexClient, api);
        data = await convexClient.query(api.crm.listProductsAndLinks, {});
      }
      return res.status(200).json(formatProductsAndLinks(data, auth.user));
    } catch (err) {
      console.error("[Vercel Convex] GET /api/products error:", err);
      return res.status(500).json({ error: "상품 및 광고링크 조회 중 오류가 발생했습니다." });
    }
  }

  if (req.method === "POST") {
    const body = parseBody(req);
    if (!body || !String(body.name || "").trim()) {
      return res.status(400).json({ error: "상품명을 입력해 주세요." });
    }
    try {
      const result = await convexClient.mutation(api.crm.upsertProduct, {
        name: String(body.name).trim(),
        code: String(body.code || `PROD_${Date.now().toString(36)}`).trim(),
        category: String(body.category || "창호").trim(),
        description: String(body.desc || body.description || "").trim(),
        url: String(body.url || "/landing/").trim(),
        active: body.active !== false,
      });
      return res.status(201).json({ id: result.prodId, message: "상품이 등록되었습니다." });
    } catch (err) {
      console.error("[Vercel Convex] POST /api/products error:", err);
      return res.status(500).json({ error: "상품 등록 중 오류가 발생했습니다." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
