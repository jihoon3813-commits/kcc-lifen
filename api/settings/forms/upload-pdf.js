import multer from "multer";
import { api } from "../../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  authenticateRequest,
} from "../../_lib/authHelper.js";
import {
  decodeKoreanFileName,
  uploadBufferToConvexStorage,
} from "../../_lib/storageHelper.js";
import { hasSettingsAccess } from "../../_lib/formDefaults.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 6,
    fieldSize: 64 * 1024,
  },
}).single("file");

function runPdfUpload(req, res) {
  return new Promise((resolve, reject) => {
    pdfUpload(req, res, (err) => {
      if (!err) return resolve();
      const e = new Error(
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "PDF 파일 크기는 10MB 이하여야 합니다."
          : err.message || "PDF 업로드 요청 형식이 올바르지 않습니다."
      );
      e.status = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      reject(e);
    });
  });
}

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
    await runPdfUpload(req, res);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  const file = req.file;
  if (!file || !file.buffer?.length) {
    return res.status(400).json({ error: "업로드할 PDF 파일을 선택해 주세요." });
  }

  const clientFileName = req.body?.fileName ? String(req.body.fileName).trim() : "";
  const safeOriginalName =
    clientFileName || decodeKoreanFileName(file.originalname, "form.pdf");

  const isPdfMime =
    file.mimetype === "application/pdf" ||
    safeOriginalName.toLowerCase().endsWith(".pdf");
  const hasPdfHeader = file.buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (!isPdfMime && !hasPdfHeader) {
    return res.status(415).json({ error: "유효한 PDF 파일만 업로드할 수 있습니다." });
  }

  try {
    const storageId = await uploadBufferToConvexStorage(
      convexClient,
      api.settings.generateUploadUrl,
      file.buffer,
      "application/pdf"
    );

    const pdfPath = `/api/settings/forms/pdf?storageId=${encodeURIComponent(storageId)}`;

    return res.status(200).json({
      success: true,
      uploaded: true,
      pdfPath,
      pdfStorageId: storageId,
      fileName: safeOriginalName,
      size: file.size,
      message: "PDF 양식 파일이 업로드되었습니다.",
    });
  } catch (err) {
    console.error("[Vercel Convex] POST /api/settings/forms/upload-pdf error:", err);
    return res.status(500).json({ error: "PDF 파일 저장 중 오류가 발생했습니다." });
  }
}
