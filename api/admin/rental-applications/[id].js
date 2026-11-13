import crypto from "node:crypto";
import { api } from "../../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
  extractSlug,
} from "../../_lib/authHelper.js";
import {
  getRentalStatusLabel,
  normalizeRentalStatusCode,
  maskBirthDate,
} from "../../_lib/crmHelper.js";
import { fetchUrlAsDataUrl } from "../../_lib/storageHelper.js";
import { maskPhone } from "../../../server/utils/mobileQuoteFormatter.js";

const ALLOWED_TRANSITIONS = {
  received: ["received", "review", "needs_info", "screening", "confirmed", "rejected", "cancelled"],
  review: ["review", "needs_info", "screening", "confirmed", "rejected", "cancelled"],
  needs_info: ["needs_info", "review", "screening", "confirmed", "rejected", "cancelled"],
  screening: ["screening", "confirmed", "needs_info", "rejected", "cancelled"],
  confirmed: ["confirmed"],
  rejected: ["rejected", "review"],
  cancelled: ["cancelled"],
};

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }

  const slug = extractSlug(req, "/api/admin/rental-applications");
  const appId = String(slug[0] || "").trim();
  const action = String(slug[1] || "").trim();

  if (!appId) {
    return res.status(400).json({ error: "신청서 ID가 필요합니다." });
  }

  try {
    const app = await convexClient.query(api.rentals.getByAppNo, { appNo: appId });
    if (!app) {
      return res.status(404).json({ error: "렌탈 신청서를 찾을 수 없습니다." });
    }

    let detailBundle = null;
    if (app.projectId) {
      try {
        detailBundle = await convexClient.query(api.crm.getCustomerDetail, {
          projectId: Number(app.projectId),
        });
      } catch {}
    }

    const project = detailBundle?.project || null;
    const quotes = detailBundle?.quotes || [];
    const latestQuote = quotes[0] || null;
    const statusCode = normalizeRentalStatusCode(app.status);
    const statusLabel = getRentalStatusLabel(statusCode);
    const months = Number(app.rentalPeriod || 60);
    const monthly = Number(app.monthlyFee || 0);
    const total = Number(app.totalRentalFee || monthly * months);
    const upfront = Math.max(0, total - monthly * months);

    if (!action && req.method === "GET") {
      const canViewSensitiveDocs =
        auth.user.role === "hq_admin" || auth.user.role === "accountant";

      let rawDocs = [];
      try {
        rawDocs = await convexClient.query(api.rentals.getDocumentsByAppNo, {
          appNo: app.appNo,
        });
      } catch (docErr) {
        console.warn("[rental-applications] getDocumentsByAppNo warning:", docErr?.message);
      }

      const documents = await Promise.all(
        (rawDocs || []).map(async (d) => {
          let dataUrl = null;
          if (canViewSensitiveDocs && !d.deletedAt && d.url) {
            if ((d.byteSize || 0) <= 1.8 * 1024 * 1024) {
              try {
                dataUrl = await fetchUrlAsDataUrl(d.url, d.mimeType || "image/png");
              } catch {}
            }
            if (!dataUrl) {
              dataUrl = d.url;
            }
          }
          return {
            id: String(d._id),
            kind: d.kind,
            versionNo: d.versionNo || 1,
            mimeType: d.mimeType || "image/png",
            byteSize: d.byteSize || 0,
            digestPrefix: d.sha256Digest ? d.sha256Digest.slice(0, 16) : "",
            isActive: Boolean(d.isActive),
            deletedAt: d.deletedAt || null,
            createdAt: d.createdAt || "",
            dataUrl,
            viewUrl: d.url || null,
          };
        })
      );

      let parsedConsents = [];
      if (app.consentsJson) {
        try {
          parsedConsents = JSON.parse(app.consentsJson);
        } catch {}
      }

      return res.status(200).json({
        application: {
          id: app.appNo,
          app_no: app.appNo,
          projectId: Number(app.projectId || 0),
          project_id: Number(app.projectId || 0),
          quoteId: app.quoteId || latestQuote?.version || 1,
          quoteNo: String(app.projectId || 0).padStart(4, "0"),
          quoteVersion: app.quoteId || latestQuote?.version || 1,
          customerName: app.customerName,
          customer_name: app.customerName,
          maskedPhone: maskPhone(app.customerPhone || ""),
          customer_phone: maskPhone(app.customerPhone || ""),
          maskedBirthDate: maskBirthDate(app.customerBirth || ""),
          customer_birth: maskBirthDate(app.customerBirth || ""),
          address: app.installationAddress || project?.customerAddress || "",
          product_summary: app.productSummary || "",
          partnerName: project?.partnerName || "직영",
          assignedTo: project?.ownerName || "미배정",
          status: statusCode,
          statusLabel,
          allowedNextStatuses: ALLOWED_TRANSITIONS[statusCode] || [statusCode],
          revision: 1,
          checks: {
            id: Boolean(app.checkId),
            signature: Boolean(app.checkSignature),
            consent: Boolean(app.checkConsent),
          },
          contractReference: app.contractReference || null,
          snapshotPricing: {
            planKey: `plan_${months}`,
            planTitle: app.productSummary || `${months}개월 렌탈`,
            upfront,
            monthly,
            months,
            total,
            cashPriceAtSubmission: Number(latestQuote?.totalPrice || total),
            quoteTypeAtSubmission: latestQuote?.quoteType || "가견적",
          },
          currentQuote: {
            quoteId: latestQuote?.version || app.quoteId || 1,
            version: latestQuote?.version || app.quoteId || 1,
            quoteType: latestQuote?.quoteType || "가견적",
            totalPrice: Number(latestQuote?.totalPrice || 0),
          },
          monthly_fee: monthly,
          rental_period: months,
          total_rental_fee: total,
          reviewNote: app.underwritingMemo || "",
          underwriting_memo: app.underwritingMemo || "",
          receivedAt: app.createdAt || "",
          created_at: app.createdAt || "",
          updatedAt: app.updatedAt || "",
        },
        documents,
        consents: Array.isArray(parsedConsents) ? parsedConsents : [],
        permissions: {
          canViewSensitiveDocs,
          canConfirmContract: auth.user.role === "hq_admin" || auth.user.role === "accountant",
          canPurgeDocs: auth.user.role === "hq_admin",
        },
      });
    }

    if (action === "audit" && req.method === "GET") {
      const auditLogs = (detailBundle?.auditLogs || []).filter(
        (l) =>
          String(l.action || "").includes("렌탈") ||
          String(l.detail || "").includes(app.appNo)
      );
      const events = auditLogs.map((l) => ({
        action: l.action || "렌탈 이력",
        actorName: l.userName || "시스템",
        detail: l.detail || "",
        eventTime: l.createdAt || "",
      }));
      if (events.length === 0 && app.createdAt) {
        events.push({
          action: "렌탈 신청 접수",
          actorName: app.customerName || "고객",
          detail: app.underwritingMemo || `${app.appNo} 접수`,
          eventTime: app.createdAt,
        });
      }
      return res.status(200).json({ events, logs: events });
    }

    if (action === "review" && (req.method === "POST" || req.method === "PATCH")) {
      const body = parseBody(req) || {};
      const nextCode = normalizeRentalStatusCode(body.status || statusCode);
      const nextLabel = getRentalStatusLabel(nextCode);
      const memo = body.memo !== undefined ? String(body.memo) : body.underwritingMemo;
      const checks = body.checks || {};
      await convexClient.mutation(api.rentals.updateReview, {
        appNo: app.appNo,
        status: nextCode,
        underwritingMemo: memo !== undefined ? String(memo) : undefined,
        contractReference:
          body.contractReference !== undefined
            ? String(body.contractReference || "").trim()
            : undefined,
        checkId: checks.id !== undefined ? Boolean(checks.id) : undefined,
        checkSignature:
          checks.signature !== undefined ? Boolean(checks.signature) : undefined,
        checkConsent: checks.consent !== undefined ? Boolean(checks.consent) : undefined,
      });
      return res.status(200).json({
        success: true,
        status: nextCode,
        statusLabel: nextLabel,
        revision: 1,
        message: "렌탈 심사 상태가 변경되었습니다.",
      });
    }

    if (action === "supplement-requests" && req.method === "POST") {
      const body = parseBody(req) || {};
      const supToken = `sup_${crypto.randomBytes(6).toString("hex")}`;
      const reason = String(
        body.customerMessage || body.reason || body.message || "서류 보완이 필요합니다."
      );
      await convexClient.mutation(api.settings.setSetting, {
        key: `supplement_${supToken}`,
        value: JSON.stringify({
          token: supToken,
          appNo: app.appNo,
          projectId: app.projectId,
          customerName: app.customerName,
          supplementType: body.supplementType || "other",
          basisNote: body.basisNote || "",
          reason,
          createdAt: new Date().toISOString(),
        }),
      });
      await convexClient.mutation(api.rentals.updateReview, {
        appNo: app.appNo,
        status: "needs_info",
        underwritingMemo: reason,
      });
      const relUrl = `/quote.html?supplement=${encodeURIComponent(supToken)}`;
      return res.status(201).json({
        token: supToken,
        url: relUrl,
        supplementUrl: relUrl,
        outboundText: `[KCC 홈씨씨 렌탈] ${app.customerName} 고객님, 서류 보완 요청 링크입니다: ${relUrl}`,
        expiresAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
        message: "보완 서류 요청 링크가 생성되었습니다.",
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[Vercel Convex] /api/admin/rental-applications/[...slug] error:", err);
    return res.status(500).json({ error: "렌탈 신청서 처리 중 오류가 발생했습니다." });
  }
}
