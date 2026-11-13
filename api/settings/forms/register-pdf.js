import { api } from "../../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
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

  const body = parseBody(req) || {};
  const storageId = String(body.storageId || "").trim();
  const fileName = String(body.fileName || "form.pdf").trim();
  if (!storageId) {
    return res.status(400).json({ error: "storageId가 필요합니다." });
  }

  try {
    const fileUrl = await convexClient.query(api.settings.getStorageFileUrl, {
      storageId,
    });
    if (!fileUrl) {
      return res.status(404).json({ error: "업로드된 PDF 파일을 찾을 수 없습니다." });
    }

    const pdfPath = `/api/settings/forms/pdf?storageId=${encodeURIComponent(storageId)}`;
    return res.status(200).json({
      success: true,
      uploaded: true,
      pdfPath,
      pdfStorageId: storageId,
      fileName,
      message: "PDF 양식 파일이 등록되었습니다.",
    });
  } catch (err) {
    console.error("[Vercel Convex] POST /api/settings/forms/register-pdf error:", err);
    return res.status(500).json({ error: "PDF 파일 등록 중 오류가 발생했습니다." });
  }
}
