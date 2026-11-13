import { api } from "../../../../convex/_generated/api.js";
import { convexClient, parseBody, setCors } from "../../../_lib/authHelper.js";
import {
  deriveCsrfToken,
  formatBundleSafeQuote,
  issueCustomerSessionCookie,
  normalizeName,
  normalizePhone,
  resolveCustomerViewer,
  signCustomerViewerToken,
} from "../../../_lib/publicQuoteHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const viewer = resolveCustomerViewer(req);
  if (!viewer) {
    return res.status(401).json({ error: "로그인이 만료되었습니다. 다시 본인확인을 진행해 주세요." });
  }

  const body = parseBody(req);
  const nextToken = String(body?.token || "").trim();
  if (!nextToken) {
    return res.status(400).json({ error: "전환할 견적 토큰이 필요합니다." });
  }

  try {
    const targetBundle = await convexClient.query(api.quotes.getPublicBundleByToken, {
      accessToken: nextToken,
    });
    if (!targetBundle) {
      return res.status(404).json({ error: "유효한 견적서를 찾을 수 없습니다." });
    }

    const sameOwner =
      normalizeName(viewer.decoded.customerName) === normalizeName(targetBundle.project.customerName) &&
      normalizePhone(viewer.decoded.customerPhone) === normalizePhone(targetBundle.project.customerPhone);
    if (!sameOwner) {
      return res.status(403).json({ error: "본인 소유의 견적서만 열람할 수 있습니다." });
    }

    const newViewerToken = signCustomerViewerToken(targetBundle);
    issueCustomerSessionCookie(res, req, newViewerToken);
    const safeQuote = formatBundleSafeQuote(targetBundle);
    res.setHeader("Cache-Control", "no-store");
    return res.json({
      verified: true,
      viewer_token: newViewerToken,
      csrf_token: deriveCsrfToken(newViewerToken),
      quote: safeQuote,
    });
  } catch (err) {
    console.error("[Vercel Convex] POST /api/public/quotes/session/switch error:", err);
    return res.status(500).json({ error: "견적 전환 중 오류가 발생했습니다." });
  }
}
