import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
} from "../_lib/authHelper.js";

function extractSecret(req, body) {
  return String(req.headers["x-bridge-secret"] || body?.secret || "").trim();
}

export default async function handler(req, res) {
  setCors(res);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Bridge-Secret");
  if (req.method === "OPTIONS") return res.status(204).end();

  const action = String(req.query.action || "").trim();

  try {
    if (action === "status" && req.method === "GET") {
      const auth = await authenticateRequest(req);
      if (!auth) {
        return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
      }
      const status = await convexClient.query(api.smsBridge.getBridgeStatus, {});
      return res.status(200).json({ ok: true, ...status });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const body = parseBody(req) || {};
    const secret = extractSecret(req, body);

    if (action === "poll") {
      const result = await convexClient.mutation(api.smsBridge.pollOutbox, {
        secret,
        deviceName: typeof body.deviceName === "string" ? body.deviceName.trim() : undefined,
        appVersion: typeof body.appVersion === "string" ? body.appVersion.trim() : undefined,
      });
      return res.status(result.ok ? 200 : 401).json(result);
    }

    if (action === "ack") {
      const outboxId = String(body.outboxId || "").trim();
      if (!outboxId) {
        return res.status(400).json({ ok: false, error: "outboxId is required" });
      }
      const result = await convexClient.mutation(api.smsBridge.ackOutbox, {
        secret,
        outboxId,
        success: Boolean(body.success),
        errorMessage: typeof body.errorMessage === "string" ? body.errorMessage : undefined,
      });
      return res.status(result.ok ? 200 : 401).json(result);
    }

    if (action === "sync") {
      const items = Array.isArray(body.items)
        ? body.items
        : Array.isArray(body.messages)
          ? body.messages
          : [];
      const result = await convexClient.mutation(api.smsBridge.syncMessages, {
        secret,
        deviceName: typeof body.deviceName === "string" ? body.deviceName.trim() : undefined,
        count: items.length,
      });
      return res.status(result.ok ? 200 : 401).json(result);
    }

    return res.status(404).json({ ok: false, error: `Unknown sms-bridge action: ${action}` });
  } catch (err) {
    console.error("[Vercel Convex] /api/sms-bridge error:", err);
    return res.status(500).json({ ok: false, error: err?.message || "Bridge request failed" });
  }
}
