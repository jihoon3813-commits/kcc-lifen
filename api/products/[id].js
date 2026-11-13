import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
} from "../_lib/authHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "PUT" && req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }

  const rawId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  const prodId = Number(rawId);
  if (!prodId || Number.isNaN(prodId)) {
    return res.status(400).json({ error: "올바른 상품 ID가 필요합니다." });
  }

  const body = parseBody(req) || {};
  try {
    const data = await convexClient.query(api.crm.listProductsAndLinks, {});
    const existing = (data.products || []).find((p) => Number(p.prodId) === prodId);
    if (!existing) {
      return res.status(404).json({ error: "상품을 찾을 수 없습니다." });
    }

    await convexClient.mutation(api.crm.upsertProduct, {
      prodId,
      name: String(body.name || existing.name).trim(),
      code: String(body.code || existing.code).trim(),
      category: String(body.category || existing.category).trim(),
      description: String(body.desc ?? body.description ?? existing.description ?? "").trim(),
      url: String(body.url ?? existing.url ?? "/landing/").trim(),
      active: body.active !== undefined ? Boolean(body.active) : existing.active,
    });

    return res.status(200).json({ id: prodId, message: "상품 정보가 수정되었습니다." });
  } catch (err) {
    console.error("[Vercel Convex] /api/products/[id] error:", err);
    return res.status(500).json({ error: "상품 수정 중 오류가 발생했습니다." });
  }
}
