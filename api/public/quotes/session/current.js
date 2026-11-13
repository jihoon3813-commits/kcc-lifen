import { api } from "../../../../convex/_generated/api.js";
import { convexClient, setCors } from "../../../_lib/authHelper.js";
import {
  clearCustomerSessionCookie,
  deriveCsrfToken,
  formatBundleSafeQuote,
  resolveCustomerViewer,
} from "../../../_lib/publicQuoteHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const viewer = resolveCustomerViewer(req);
  if (!viewer) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const reqToken = String(req.query.token || "").trim();
    const bundle = await convexClient.query(api.quotes.getPublicBundleByToken, {
      accessToken: viewer.decoded.accessToken,
    });

    if (!bundle) {
      clearCustomerSessionCookie(res, req);
      return res.status(401).json({ authenticated: false });
    }

    if (reqToken && bundle.quote.accessToken !== reqToken) {
      return res.status(401).json({ authenticated: false, reason: "token_mismatch" });
    }

    const safeQuote = formatBundleSafeQuote(bundle);
    res.setHeader("Cache-Control", "no-store");
    return res.json({
      authenticated: true,
      verified: true,
      viewer_token: viewer.token,
      csrf_token: deriveCsrfToken(viewer.token),
      quote: safeQuote,
      available_quotes:
        bundle.availableQuotes && bundle.availableQuotes.length > 1
          ? bundle.availableQuotes
          : undefined,
    });
  } catch (err) {
    console.error("[Vercel Convex] GET /api/public/quotes/session/current error:", err);
    return res.status(401).json({ authenticated: false });
  }
}
