import { ConvexHttpClient } from "convex/browser";
import jwt from "jsonwebtoken";
import { api } from "../../convex/_generated/api.js";
import {
  ALL_MENUS,
  ROLE_LABELS,
  parseAllowedMenus,
} from "../../server/utils/menuPermissions.js";

const CONVEX_URL = process.env.CONVEX_URL || "https://savory-hedgehog-927.convex.cloud";
export const convexClient = new ConvexHttpClient(CONVEX_URL);
export const JWT_SECRET = process.env.JWT_SECRET || "kcc-homecc-crm-secret-key-2026-life-and-joy";
export const JWT_EXPIRES_IN = "7d";

export function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export function parseBody(req) {
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body || {};
}

export function serializeConvexUser(u) {
  if (!u) return null;
  const role = u.role || "consultant";
  return {
    id: u.userId || 1,
    org_id: u.orgId || 1,
    username: u.username,
    name: u.name,
    email: u.email || "",
    phone: u.phone || "",
    role,
    role_label: ROLE_LABELS[role] || "담당자",
    org_name: u.orgName || "라이프앤조이",
    org: u.orgName || "라이프앤조이",
    org_type: u.orgType || (role === "partner" ? "partner" : "hq"),
    parent_id: u.parentId ?? null,
    level: u.level ?? (role === "partner" ? 1 : 0),
    sub_partner_count: u.subPartnerCount || 0,
    allowed_menus: parseAllowedMenus(u.allowedMenus, role, u.username),
    active: Boolean(u.active),
  };
}

export function signToken(user) {
  return jwt.sign(
    {
      id: user.userId || 1,
      username: user.username,
      role: user.role,
      org_id: user.orgId || 1,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export async function authenticateRequest(req) {
  let token = null;
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    let user = null;
    if (decoded.username) {
      user = await convexClient.query(api.auth.getUserByUsername, {
        username: String(decoded.username),
      });
    }
    if (!user && decoded.id) {
      user = await convexClient.query(api.auth.getUserByUserId, {
        userId: Number(decoded.id),
      });
    }
    if (!user || !user.active) return null;
    return { raw: user, user: serializeConvexUser(user) };
  } catch {
    return null;
  }
}

export { ALL_MENUS };

/**
 * Extract path segments for Vercel `[...slug].js` routes regardless of whether
 * the runtime sets `req.query.slug`, `req.query["...slug"]`, or only `req.url`.
 */
export function extractSlug(req, basePath) {
  const fromQuery = req.query?.slug ?? req.query?.["...slug"];
  if (fromQuery !== undefined && fromQuery !== null && String(fromQuery).trim() !== "") {
    const arr = Array.isArray(fromQuery) ? fromQuery : [fromQuery];
    const parts = arr
      .flatMap((item) => String(item).split("/"))
      .map((s) => {
        try {
          return decodeURIComponent(s).trim();
        } catch {
          return String(s).trim();
        }
      })
      .filter(Boolean);
    if (parts.length > 0) return parts;
  }

  const rawUrl = String(req.url || "");
  const pathname = rawUrl.split("?")[0];
  const prefix = basePath.endsWith("/") ? basePath : `${basePath}/`;
  if (pathname.startsWith(prefix)) {
    return pathname
      .slice(prefix.length)
      .split("/")
      .map((s) => {
        try {
          return decodeURIComponent(s).trim();
        } catch {
          return String(s).trim();
        }
      })
      .filter(Boolean);
  }
  return [];
}
