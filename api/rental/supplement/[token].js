import crypto from "node:crypto";
import multer from "multer";
import { api } from "../../../convex/_generated/api.js";
import { convexClient, setCors } from "../../_lib/authHelper.js";
import { uploadBufferToConvexStorage } from "../../_lib/storageHelper.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 2,
    fields: 10,
    fieldSize: 64 * 1024,
  },
}).fields([
  { name: "idDocument", maxCount: 1 },
  { name: "signature", maxCount: 1 },
]);

function runMultipart(req, res) {
  return new Promise((resolve, reject) => {
    uploadMiddleware(req, res, (err) => {
      if (!err) return resolve();
      const e = new Error(
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "첨부 파일 크기는 10MB 이하여야 합니다."
          : "첨부 파일 요청 형식이 올바르지 않습니다."
      );
      e.status = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      reject(e);
    });
  });
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const rawToken = Array.isArray(req.query?.token) ? req.query.token[0] : req.query?.token;
  const supToken = String(rawToken || "").trim();
  if (!supToken) {
    return res.status(400).json({ error: "보완 요청 토큰이 필요합니다." });
  }

  try {
    const setting = await convexClient.query(api.settings.getSetting, {
      key: `supplement_${supToken}`,
    });
    if (!setting) {
      return res.status(404).json({ error: "유효하지 않거나 만료된 보완 요청 링크입니다." });
    }
    const info = JSON.parse(setting.value);

    if (req.method === "GET") {
      return res.status(200).json({
        token: supToken,
        appNo: info.appNo,
        customerName: info.customerName,
        reason: info.reason,
        createdAt: info.createdAt,
      });
    }

    if (req.method === "POST") {
      const contentType = String(req.headers["content-type"] || "");
      let body = {};
      let idDocFile = null;
      let sigFile = null;

      if (contentType.includes("multipart/form-data")) {
        await runMultipart(req, res);
        body = req.body || {};
        idDocFile = req.files?.idDocument?.[0] || null;
        sigFile = req.files?.signature?.[0] || null;
      } else {
        body = await readJsonBody(req);
      }

      const saveTasks = [];
      const docLabels = [];

      if (idDocFile?.buffer?.length) {
        const mime = idDocFile.mimetype || "image/jpeg";
        const storageId = await uploadBufferToConvexStorage(
          convexClient,
          api.rentals.generateUploadUrl,
          idDocFile.buffer,
          mime
        );
        const digest = crypto.createHash("sha256").update(idDocFile.buffer).digest("hex");
        saveTasks.push(
          convexClient.mutation(api.rentals.saveDocument, {
            appNo: info.appNo,
            kind: "id_card",
            storageId,
            mimeType: mime,
            byteSize: idDocFile.size,
            sha256Digest: digest,
          })
        );
        docLabels.push(`신분증 ${Math.round(idDocFile.size / 1024)}KB`);
      }

      if (sigFile?.buffer?.length) {
        const mime = sigFile.mimetype || "image/png";
        const storageId = await uploadBufferToConvexStorage(
          convexClient,
          api.rentals.generateUploadUrl,
          sigFile.buffer,
          mime
        );
        const digest = crypto.createHash("sha256").update(sigFile.buffer).digest("hex");
        saveTasks.push(
          convexClient.mutation(api.rentals.saveDocument, {
            appNo: info.appNo,
            kind: "signature",
            storageId,
            mimeType: mime,
            byteSize: sigFile.size,
            sha256Digest: digest,
          })
        );
        docLabels.push(`전자서명 ${Math.round(sigFile.size / 1024)}KB`);
      }

      if (saveTasks.length > 0) {
        await Promise.all(saveTasks);
      }

      const memoDetail = docLabels.length ? docLabels.join(", ") : body.memo || "첨부 확인";
      await convexClient.mutation(api.rentals.updateReview, {
        appNo: info.appNo,
        status: "review",
        underwritingMemo: `고객 보완 서류 제출 완료 (${memoDetail})`,
        checkId: false,
        checkSignature: false,
      });

      return res.status(200).json({
        success: true,
        receiptId: info.appNo,
        message: "보완 서류가 정상적으로 제출되었습니다.",
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[Vercel Convex] /api/rental/supplement/[token] error:", err);
    return res
      .status(err.status || 500)
      .json({ error: err.message || "보완 서류 처리 중 오류가 발생했습니다." });
  }
}
