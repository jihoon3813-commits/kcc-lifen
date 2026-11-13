import { api } from "../../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
} from "../../_lib/authHelper.js";
import { formatProductsAndLinks, generateLinkCode } from "../../_lib/productHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }

  if (req.method === "GET") {
    try {
      const data = await convexClient.query(api.crm.listProductsAndLinks, {});
      const formatted = formatProductsAndLinks(data, auth.user);
      return res.status(200).json({ landingLinks: formatted.landingLinks });
    } catch (err) {
      console.error("[Vercel Convex] GET /api/products/links error:", err);
      return res.status(500).json({ error: "광고링크 목록 조회 중 오류가 발생했습니다." });
    }
  }

  if (req.method === "POST") {
    const body = parseBody(req);
    if (!body) {
      return res.status(400).json({ error: "요청 본문이 올바르지 않습니다." });
    }

    const cleanChannel = String(body.channel || "").trim();
    const cleanName = String(body.name || "").trim();
    if (!cleanChannel || !cleanName) {
      return res.status(400).json({ error: "광고채널과 캠페인명을 모두 입력해 주세요." });
    }

    try {
      const data = await convexClient.query(api.crm.listProductsAndLinks, {});
      const existingCodes = new Set((data.landingLinks || []).map((l) => l.code));
      const code = generateLinkCode(cleanChannel, body.code, existingCodes);
      const partnerName =
        auth.user.role === "partner"
          ? auth.user.org_name
          : String(body.partnerName || "직영").trim();

      const saved = await convexClient.mutation(api.crm.upsertLandingLink, {
        productId: body.productId ? Number(body.productId) : undefined,
        code,
        name: cleanName,
        channel: cleanChannel,
        campaign: String(body.campaign || cleanName).trim(),
        partnerName,
        targetUrl: String(body.targetUrl || "/landing/").trim(),
        active: body.isActive !== false,
      });

      const refreshed = await convexClient.query(api.crm.listProductsAndLinks, {});
      const formatted = formatProductsAndLinks(refreshed, auth.user);
      const created = formatted.landingLinks.find((l) => Number(l.id) === Number(saved.linkId));
      return res.status(201).json({
        link: created,
        landingLinks: formatted.landingLinks,
      });
    } catch (err) {
      console.error("[Vercel Convex] POST /api/products/links error:", err);
      return res.status(500).json({ error: "광고링크 생성 중 오류가 발생했습니다." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
