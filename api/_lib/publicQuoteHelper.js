import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./authHelper.js";
import { formatCustomerSafeQuote } from "../../server/utils/mobileQuoteFormatter.js";
import {
  mapConvexQuoteForFormatter,
  mapConvexItemsForFormatter,
} from "../../server/utils/quoteService.js";

export const CUSTOMER_SESSION_COOKIE = "kcc_viewer_session";

export function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, "");
}

export function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

export function parseCookies(req) {
  const header = req.headers?.cookie || "";
  const out = {};
  if (!header) return out;
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx <= 0) continue;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

export function deriveCsrfToken(viewerToken) {
  return crypto
    .createHmac("sha256", JWT_SECRET)
    .update(String(viewerToken || ""))
    .digest("hex")
    .slice(0, 32);
}

export function signCustomerViewerToken({ quote, project }) {
  return jwt.sign(
    {
      scope: "customer_quote_viewer",
      quoteVersion: quote.version,
      projectId: project.projectId,
      accessToken: quote.accessToken,
      customerName: project.customerName,
      customerPhone: project.customerPhone,
    },
    JWT_SECRET,
    { expiresIn: "6h" }
  );
}

export function resolveCustomerViewer(req) {
  const cookies = parseCookies(req);
  let token = cookies[CUSTOMER_SESSION_COOKIE];
  if (!token) {
    const authHeader = req.headers?.authorization || req.headers?.Authorization || "";
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.scope !== "customer_quote_viewer" || !decoded.accessToken) {
      return null;
    }
    return { token, decoded };
  } catch {
    return null;
  }
}

export function issueCustomerSessionCookie(res, req, viewerToken) {
  const isSecure =
    req.headers?.["x-forwarded-proto"] === "https" ||
    process.env.NODE_ENV === "production";
  const attrs = [
    `${CUSTOMER_SESSION_COOKIE}=${encodeURIComponent(viewerToken)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=21600",
  ];
  if (isSecure) attrs.push("Secure");
  res.setHeader("Set-Cookie", attrs.join("; "));
}

export function clearCustomerSessionCookie(res, req) {
  const isSecure =
    req.headers?.["x-forwarded-proto"] === "https" ||
    process.env.NODE_ENV === "production";
  const attrs = [
    `${CUSTOMER_SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (isSecure) attrs.push("Secure");
  res.setHeader("Set-Cookie", attrs.join("; "));
}

export function formatBundleSafeQuote(bundle) {
  const mappedQuote = mapConvexQuoteForFormatter(
    bundle.quote,
    bundle.project,
    bundle.managerPhone || "",
    bundle.orgPhone || ""
  );
  const rawItems = mapConvexItemsForFormatter(bundle.items || []);
  return formatCustomerSafeQuote(mappedQuote, rawItems);
}
