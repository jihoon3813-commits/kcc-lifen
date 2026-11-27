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

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }
  if (auth.user.role === "partner") {
    return res.status(403).json({ error: "본사 관리자만 복구 보관함에 접근할 수 있습니다." });
  }

  try {
    if (req.method === "GET") {
      const url = new URL(req.url, "http://localhost");
      const archiveType = url.searchParams.get("type") || "all";
      const includeRestored = url.searchParams.get("includeRestored") === "1";
      const items = await convexClient.query(api.archive.listDeletedArchives, {
        archiveType,
        includeRestored,
        limit: 120,
      });
      return res.status(200).json({ items });
    }

    if (req.method === "POST") {
      const body = parseBody(req) || {};
      const archiveId = String(body.archiveId || "").trim();
      if (!archiveId) {
        return res.status(400).json({ error: "복원할 보관함 ID가 필요합니다." });
      }
      const result = await convexClient.mutation(api.archive.restoreDeletedArchive, {
        archiveId,
        userName: auth.user.name || "관리자",
      });
      if (!result?.ok) {
        return res.status(400).json({ error: result?.error || "복원에 실패했습니다." });
      }
      return res.status(200).json(result);
    }

    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (err) {
    console.error("[Vercel Convex] /api/archive error:", err);
    return res.status(500).json({ error: "복구 보관함 처리 중 오류가 발생했습니다." });
  }
}
