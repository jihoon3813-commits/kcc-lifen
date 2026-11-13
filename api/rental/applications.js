import crypto from "node:crypto";
import multer from "multer";
import { api } from "../../convex/_generated/api.js";
import { convexClient, setCors } from "../_lib/authHelper.js";
import { deriveCsrfToken, resolveCustomerViewer } from "../_lib/publicQuoteHelper.js";
import { uploadBufferToConvexStorage } from "../_lib/storageHelper.js";
import { notifyNewContract } from "../_lib/discordHelper.js";
import { buildRentalPlans } from "../../server/utils/mobileQuoteFormatter.js";
import { toPlanResponse } from "./context.js";

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
    fields: 12,
    fieldSize: 64 * 1024,
  },
}).fields([
  { name: "idDocument", maxCount: 1 },
  { name: "signature", maxCount: 1 },
]);

function runMultipartUpload(req, res) {
  return new Promise((resolve, reject) => {
    uploadMiddleware(req, res, (err) => {
      if (!err) return resolve();
      if (err instanceof multer.MulterError) {
        const e = new Error(
          err.code === "LIMIT_FILE_SIZE"
            ? "첨부 파일 크기는 10MB 이하여야 합니다."
            : "첨부 파일 요청 형식이 올바르지 않습니다."
        );
        e.status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        return reject(e);
      }
      reject(err);
    });
  });
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const viewer = resolveCustomerViewer(req);
  if (!viewer) {
    return res.status(401).json({ error: "세션이 만료되었습니다. 본인확인 로그인 후 다시 신청해주세요." });
  }

  const csrfHeader = String(req.headers["x-csrf-token"] || "");
  if (!csrfHeader || csrfHeader !== deriveCsrfToken(viewer.token)) {
    return res.status(403).json({ error: "보안 토큰이 유효하지 않습니다. 페이지를 새로고침해 주세요." });
  }

  try {
    await runMultipartUpload(req, res);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  let applicant = {};
  let quoteReq = {};
  let consents = [];
  try {
    applicant = JSON.parse(req.body?.applicant || "{}");
    quoteReq = JSON.parse(req.body?.quote || "{}");
    consents = JSON.parse(req.body?.consents || "[]");
  } catch {
    return res.status(400).json({ error: "신청 데이터 형식이 올바르지 않습니다." });
  }

  const birthDigits = String(applicant.birthDate || "").replace(/\D/g, "");
  if (birthDigits.length !== 8 && birthDigits.length !== 6) {
    return res.status(400).json({ error: "생년월일을 정확히 입력해 주세요." });
  }

  const idDocFile = req.files?.idDocument?.[0];
  const sigFile = req.files?.signature?.[0];
  if (!idDocFile || !sigFile) {
    return res.status(400).json({ error: "신분증 사진과 전자서명을 모두 제출해 주세요." });
  }

  if (!Array.isArray(consents) || consents.length < 3 || consents.some((c) => !c.agreed)) {
    return res.status(400).json({ error: "필수 약관에 모두 동의해 주세요." });
  }

  try {
    const bundle = await convexClient.query(api.quotes.getPublicBundleByToken, {
      accessToken: viewer.decoded.accessToken,
    });
    if (!bundle) {
      return res.status(404).json({ error: "유효한 발행 견적서를 찾을 수 없습니다." });
    }

    const { quote, project } = bundle;
    const allApps = await convexClient.query(api.rentals.list, {});
    const existingActive = (allApps || []).find(
      (a) =>
        Number(a.projectId) === Number(project.projectId) &&
        !["rejected", "cancelled", "심사반려", "취소"].includes(String(a.status || ""))
    );
    if (existingActive) {
      return res.status(409).json({
        code: "ACTIVE_APPLICATION_EXISTS",
        error: `이미 접수된 렌탈 신청(${existingActive.appNo})이 존재합니다.`,
      });
    }

    const planMap = toPlanResponse(buildRentalPlans(quote.totalPrice, quote.discountAmount || 0));
    const planKey = String(quoteReq.plan || "plan222");
    const selectedPlan = planMap[planKey] || planMap.plan222;

    const now = new Date();
    const ymd = now.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
    const appNo = `R-${ymd}-${project.projectId}-${rand}`;

    const idMime = idDocFile.mimetype || "image/jpeg";
    const sigMime = sigFile.mimetype || "image/png";
    const [idStorageId, sigStorageId] = await Promise.all([
      uploadBufferToConvexStorage(
        convexClient,
        api.rentals.generateUploadUrl,
        idDocFile.buffer,
        idMime
      ),
      uploadBufferToConvexStorage(
        convexClient,
        api.rentals.generateUploadUrl,
        sigFile.buffer,
        sigMime
      ),
    ]);

    const idDigest = crypto.createHash("sha256").update(idDocFile.buffer).digest("hex");
    const sigDigest = crypto.createHash("sha256").update(sigFile.buffer).digest("hex");

    await convexClient.mutation(api.rentals.upsertApplication, {
      appNo,
      projectId: project.projectId,
      quoteId: quote.version,
      customerName: project.customerName,
      customerPhone: project.customerPhone,
      customerBirth: String(applicant.birthDate || "").trim(),
      installationAddress: project.customerAddress || "",
      productSummary: `KCC 홈씨씨 ${project.product || "창호"} (${selectedPlan.title})`,
      monthlyFee: Number(selectedPlan.monthly || 0),
      rentalPeriod: Number(selectedPlan.months || 60),
      totalRentalFee: Number(selectedPlan.total || 0),
      status: "received",
      underwritingMemo: `온라인 렌탈 신청 접수 (신분증 ${Math.round(idDocFile.size / 1024)}KB, 전자서명 ${Math.round(sigFile.size / 1024)}KB 첨부)`,
      checkId: false,
      checkSignature: false,
      checkConsent: false,
      consentsJson: JSON.stringify(consents),
    });

    await Promise.all([
      convexClient.mutation(api.rentals.saveDocument, {
        appNo,
        kind: "id_card",
        storageId: idStorageId,
        mimeType: idMime,
        byteSize: idDocFile.size,
        sha256Digest: idDigest,
      }),
      convexClient.mutation(api.rentals.saveDocument, {
        appNo,
        kind: "signature",
        storageId: sigStorageId,
        mimeType: sigMime,
        byteSize: sigFile.size,
        sha256Digest: sigDigest,
      }),
    ]);

    await convexClient.mutation(api.crm.upsertContract, {
      contractNo: appNo,
      projectId: project.projectId,
      customerName: project.customerName,
      customerPhone: project.customerPhone,
      status: "렌탈접수",
      totalAmount: Number(selectedPlan.total || quote.totalPrice || 0),
      depositAmount: Number(selectedPlan.upfront || 0),
      balanceAmount: Math.max(
        0,
        Number(selectedPlan.total || quote.totalPrice || 0) - Number(selectedPlan.upfront || 0)
      ),
      contractDate: now.toISOString().slice(0, 10),
    });

    await notifyNewContract({
      category: "신규 렌탈 신청 접수",
      contractNo: appNo,
      customerName: project.customerName,
      phone: project.customerPhone,
      contractType: "렌탈",
      status: "렌탈접수",
      totalAmount: Number(selectedPlan.total || quote.totalPrice || 0),
      depositAmount: Number(selectedPlan.upfront || 0),
      balanceAmount: Math.max(
        0,
        Number(selectedPlan.total || quote.totalPrice || 0) - Number(selectedPlan.upfront || 0)
      ),
      product: `KCC 홈씨씨 ${project.product || "창호"} (${selectedPlan.title})`,
      partnerName: project.partnerName || "직영",
      contractDate: now.toISOString().slice(0, 10),
      address: project.customerAddress || "",
      summary: `월 ${Number(selectedPlan.monthly || 0).toLocaleString("ko-KR")}원 × ${Number(selectedPlan.months || 60)}개월 (신분증·전자서명 첨부 완료)`,
    });

    return res.status(201).json({
      receiptId: appNo,
      status: "received",
      statusLabel: "접수완료",
      plan: selectedPlan,
      submittedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("[Vercel Convex] POST /api/rental/applications error:", err);
    return res.status(500).json({ error: "렌탈 신청 접수 중 오류가 발생했습니다." });
  }
}
