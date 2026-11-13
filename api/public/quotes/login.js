import { api } from "../../../convex/_generated/api.js";
import { convexClient, parseBody, setCors } from "../../_lib/authHelper.js";
import {
  deriveCsrfToken,
  formatBundleSafeQuote,
  issueCustomerSessionCookie,
  normalizeName,
  normalizePhone,
  signCustomerViewerToken,
} from "../../_lib/publicQuoteHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = parseBody(req);
  if (!body) {
    return res.status(400).json({ error: "잘못된 요청 형식입니다." });
  }

  const { token, name, phone } = body;
  if (!name || !String(name).trim() || !phone || !String(phone).trim()) {
    return res.status(400).json({ error: "성함과 휴대폰 번호를 모두 입력해 주세요." });
  }

  const cleanInputName = normalizeName(name);
  const cleanInputPhone = normalizePhone(phone);

  if (cleanInputPhone.length < 10 || cleanInputPhone.length > 11) {
    return res.status(400).json({ error: "올바른 휴대폰 번호(10~11자리)를 입력해 주세요." });
  }

  try {
    let bundle = null;

    if (token && String(token).trim()) {
      bundle = await convexClient.query(api.quotes.getPublicBundleByToken, {
        accessToken: String(token).trim(),
      });
      if (!bundle) {
        return res.status(404).json({ error: "유효한 견적서를 찾을 수 없습니다." });
      }
      const cleanDbName = normalizeName(bundle.project.customerName);
      const cleanDbPhone = normalizePhone(bundle.project.customerPhone);
      if (cleanInputName !== cleanDbName || cleanInputPhone !== cleanDbPhone) {
        return res.status(401).json({
          error: "입력하신 이름 또는 휴대폰 번호가 견적서 고객 정보와 일치하지 않습니다.",
        });
      }
    } else {
      bundle = await convexClient.query(api.quotes.findPublishedQuotesByCustomer, {
        customerName: String(name).trim(),
        customerPhone: String(phone).trim(),
      });
      if (!bundle) {
        return res.status(401).json({
          error: "입력하신 이름과 휴대폰 번호로 발행된 견적서를 찾을 수 없습니다.",
        });
      }
    }

    await convexClient.mutation(api.quotes.recordPublicQuoteView, {
      projectId: bundle.project.projectId,
      quoteVersion: bundle.quote.version,
      accessToken: bundle.quote.accessToken || "",
    });

    const viewerToken = signCustomerViewerToken(bundle);
    const safeQuote = formatBundleSafeQuote(bundle);

    issueCustomerSessionCookie(res, req, viewerToken);
    res.setHeader("Cache-Control", "no-store");

    return res.json({
      verified: true,
      viewer_token: viewerToken,
      csrf_token: deriveCsrfToken(viewerToken),
      quote: safeQuote,
      available_quotes:
        bundle.availableQuotes && bundle.availableQuotes.length > 1
          ? bundle.availableQuotes
          : undefined,
    });
  } catch (err) {
    console.error("[Vercel Convex] POST /api/public/quotes/login error:", err);
    return res.status(500).json({ error: "본인 확인 처리 중 오류가 발생했습니다." });
  }
}
