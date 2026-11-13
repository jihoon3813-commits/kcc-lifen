import crypto from "node:crypto";
import { api } from "../../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
} from "../../_lib/authHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }

  const slug = Array.isArray(req.query?.slug) ? req.query.slug : [req.query?.slug].filter(Boolean);
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

    if (!action && req.method === "GET") {
      return res.status(200).json({
        application: {
          id: app.appNo,
          app_no: app.appNo,
          project_id: app.projectId,
          customer_name: app.customerName,
          customer_phone: app.customerPhone,
          customer_birth: app.customerBirth || "",
          address: app.installationAddress || "",
          product_summary: app.productSummary || "",
          monthly_fee: app.monthlyFee,
          rental_period: app.rentalPeriod,
          total_rental_fee: app.totalRentalFee,
          status: app.status,
          underwriting_memo: app.underwritingMemo || "",
          created_at: app.createdAt || "",
        },
      });
    }

    if (action === "audit" && req.method === "GET") {
      return res.status(200).json({ logs: [] });
    }

    if (action === "review" && (req.method === "POST" || req.method === "PATCH")) {
      const body = parseBody(req) || {};
      const nextStatus = String(body.status || app.status);
      const memo = body.memo !== undefined ? String(body.memo) : body.underwritingMemo;
      await convexClient.mutation(api.rentals.updateReview, {
        appNo: app.appNo,
        status: nextStatus,
        underwritingMemo: memo !== undefined ? String(memo) : undefined,
      });
      return res.status(200).json({
        success: true,
        status: nextStatus,
        message: "렌탈 심사 상태가 변경되었습니다.",
      });
    }

    if (action === "supplement-requests" && req.method === "POST") {
      const body = parseBody(req) || {};
      const supToken = `sup_${crypto.randomBytes(6).toString("hex")}`;
      await convexClient.mutation(api.settings.setSetting, {
        key: `supplement_${supToken}`,
        value: JSON.stringify({
          token: supToken,
          appNo: app.appNo,
          projectId: app.projectId,
          customerName: app.customerName,
          reason: String(body.reason || body.message || "서류 보완이 필요합니다."),
          createdAt: new Date().toISOString(),
        }),
      });
      await convexClient.mutation(api.rentals.updateReview, {
        appNo: app.appNo,
        status: "supplement",
        underwritingMemo: String(body.reason || "서류 보완 요청 발송"),
      });
      return res.status(201).json({
        token: supToken,
        url: `/quote.html?supplement=${encodeURIComponent(supToken)}`,
        message: "보완 서류 요청 링크가 생성되었습니다.",
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[Vercel Convex] /api/admin/rental-applications/[...slug] error:", err);
    return res.status(500).json({ error: "렌탈 심사 처리 중 오류가 발생했습니다." });
  }
}
