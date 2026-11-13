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

  const rawId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  const linkId = Number(rawId);
  if (!linkId || Number.isNaN(linkId)) {
    return res.status(400).json({ error: "올바른 링크 ID가 필요합니다." });
  }

  if (req.method === "PATCH" || req.method === "PUT") {
    const body = parseBody(req);
    if (!body) {
      return res.status(400).json({ error: "요청 본문이 올바르지 않습니다." });
    }

    try {
      const data = await convexClient.query(api.crm.listProductsAndLinks, {});
      const existing = (data.landingLinks || []).find((l) => Number(l.linkId) === linkId);
      if (!existing) {
        return res.status(404).json({ error: "수정할 광고링크를 찾을 수 없습니다." });
      }
      if (auth.user.role === "partner" && existing.partnerName !== auth.user.org_name) {
        return res.status(403).json({ error: "소속 파트너 링크만 수정할 수 있습니다." });
      }

      const existingCodes = new Set(
        (data.landingLinks || []).filter((l) => Number(l.linkId) !== linkId).map((l) => l.code)
      );
      const nextChannel = String(body.channel || existing.channel).trim();
      const nextCode = body.code
        ? generateLinkCode(nextChannel, body.code, existingCodes)
        : existing.code;

      await convexClient.mutation(api.crm.upsertLandingLink, {
        linkId,
        productId: body.productId !== undefined ? Number(body.productId) : existing.productId,
        code: nextCode,
        name: String(body.name || existing.name).trim(),
        channel: nextChannel,
        campaign: String(body.campaign || body.name || existing.campaign || existing.name).trim(),
        partnerName:
          auth.user.role === "partner"
            ? existing.partnerName
            : String(body.partnerName || existing.partnerName || "직영").trim(),
        targetUrl: String(body.targetUrl || existing.targetUrl || "/landing/").trim(),
        active: body.isActive !== undefined ? Boolean(body.isActive) : existing.active,
      });

      const refreshed = await convexClient.query(api.crm.listProductsAndLinks, {});
      const formatted = formatProductsAndLinks(refreshed, auth.user);
      return res.status(200).json({ landingLinks: formatted.landingLinks });
    } catch (err) {
      console.error("[Vercel Convex] PATCH /api/products/links/[id] error:", err);
      return res.status(500).json({ error: "광고링크 수정 중 오류가 발생했습니다." });
    }
  }

  if (req.method === "DELETE") {
    try {
      const data = await convexClient.query(api.crm.listProductsAndLinks, {});
      const existing = (data.landingLinks || []).find((l) => Number(l.linkId) === linkId);
      if (!existing) {
        return res.status(404).json({ error: "삭제할 광고링크를 찾을 수 없습니다." });
      }
      if (auth.user.role === "partner" && existing.partnerName !== auth.user.org_name) {
        return res.status(403).json({ error: "소속 파트너 링크만 삭제할 수 있습니다." });
      }

      await convexClient.mutation(api.crm.deleteLandingLink, { linkId });
      const refreshed = await convexClient.query(api.crm.listProductsAndLinks, {});
      const formatted = formatProductsAndLinks(refreshed, auth.user);
      return res.status(200).json({ deleted: true, landingLinks: formatted.landingLinks });
    } catch (err) {
      console.error("[Vercel Convex] DELETE /api/products/links/[id] error:", err);
      return res.status(500).json({ error: "광고링크 삭제 중 오류가 발생했습니다." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
