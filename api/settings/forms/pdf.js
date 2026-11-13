import { api } from "../../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  authenticateRequest,
} from "../../_lib/authHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const storageId = String(req.query?.storageId || "").trim();
  if (!storageId) {
    return res.status(400).json({ error: "storageId가 필요합니다." });
  }

  try {
    let fileUrl = await convexClient.query(api.settings.getConsentFormPdfUrl, {
      storageId,
    });

    if (!fileUrl) {
      const auth = await authenticateRequest(req);
      if (auth) {
        fileUrl = await convexClient.query(api.settings.getStorageFileUrl, {
          storageId,
        });
      }
    }

    if (!fileUrl) {
      return res.status(404).json({ error: "요청하신 PDF 양식을 찾을 수 없습니다." });
    }

    const upstream = await fetch(fileUrl);
    if (!upstream.ok) {
      return res.status(502).json({ error: "PDF 저장소에서 파일을 불러오지 못했습니다." });
    }

    const lenHeader = Number(upstream.headers.get("content-length") || 0);
    if (lenHeader > 4 * 1024 * 1024) {
      return res.redirect(302, fileUrl);
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.length > 4 * 1024 * 1024) {
      return res.redirect(302, fileUrl);
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "private, max-age=300");
    res.setHeader("Content-Length", String(buf.length));
    return res.status(200).send(buf);
  } catch (err) {
    console.error("[Vercel Convex] GET /api/settings/forms/pdf error:", err);
    return res.status(500).json({ error: "PDF 파일 조회 중 오류가 발생했습니다." });
  }
}
