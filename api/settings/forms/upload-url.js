import { api } from "../../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  authenticateRequest,
} from "../../_lib/authHelper.js";
import { hasSettingsAccess } from "../../_lib/formDefaults.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }
  if (!hasSettingsAccess(auth)) {
    return res.status(403).json({ error: "양식 관리 권한이 없습니다." });
  }

  try {
    const uploadUrl = await convexClient.mutation(api.settings.generateUploadUrl, {});
    return res.status(200).json({ uploadUrl });
  } catch (err) {
    console.error("[Vercel Convex] POST /api/settings/forms/upload-url error:", err);
    return res.status(500).json({ error: "업로드 URL 발급 중 오류가 발생했습니다." });
  }
}
