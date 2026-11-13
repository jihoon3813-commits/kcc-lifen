import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
  extractSlug,
} from "../_lib/authHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }

  const slug = extractSlug(req, "/api/contracts");
  const contractId = String(slug[0] || "").trim();
  const action = String(slug[1] || "").trim();

  if (!contractId) {
    return res.status(400).json({ error: "계약 ID가 필요합니다." });
  }

  try {
    const data = await convexClient.query(api.crm.listContracts, {});
    let target = (data.contracts || []).find(
      (c) => c.contractNo === contractId || String(c.projectId) === contractId || String(c._id) === contractId
    );
    if (!target) {
      const rentalApp = await convexClient.query(api.rentals.getByAppNo, { appNo: contractId });
      if (rentalApp && rentalApp.projectId) {
        const months = Number(rentalApp.rentalPeriod || 60);
        const monthly = Number(rentalApp.monthlyFee || 0);
        const total = Number(rentalApp.totalRentalFee || monthly * months);
        const upfront = Math.max(0, total - monthly * months);
        target = {
          contractNo: rentalApp.appNo,
          projectId: Number(rentalApp.projectId),
          customerName: rentalApp.customerName,
          customerPhone: rentalApp.customerPhone,
          status: "렌탈접수",
          totalAmount: total,
          depositAmount: upfront,
          balanceAmount: Math.max(0, total - upfront),
          contractDate: rentalApp.createdAt ? rentalApp.createdAt.slice(0, 10) : "",
          signedAt: rentalApp.createdAt || "",
        };
      }
    }
    if (!target) {
      return res.status(404).json({ error: "계약을 찾을 수 없습니다." });
    }

    if (action === "pg-order" && req.method === "POST") {
      const body = parseBody(req) || {};
      const orderNo = `PG-${Date.now()}-${target.projectId}`;
      return res.status(200).json({
        order_no: orderNo,
        amount: Number(body.amount || target.balanceAmount || target.totalAmount || 0),
      });
    }

    if (action === "pg-approve" && req.method === "POST") {
      const body = parseBody(req) || {};
      const paidAmt = Number(body.amount || target.balanceAmount || 0);
      const nextDeposit = Number(target.depositAmount || 0) + paidAmt;
      const nextBalance = Math.max(0, Number(target.totalAmount || 0) - nextDeposit);
      await convexClient.mutation(api.crm.upsertContract, {
        contractNo: target.contractNo,
        projectId: target.projectId,
        customerName: target.customerName,
        customerPhone: target.customerPhone,
        status: nextBalance === 0 ? "완납" : "계약금완료",
        totalAmount: target.totalAmount,
        depositAmount: nextDeposit,
        balanceAmount: nextBalance,
        contractDate: target.contractDate,
        signedAt: new Date().toISOString(),
      });
      return res.status(200).json({
        approved: true,
        order_no: body.orderNo || "",
        message: "결제가 승인되었습니다.",
      });
    }

    if (action === "cash-receipts" && req.method === "POST") {
      return res.status(200).json({
        issued: true,
        receipt_no: `CR-${Date.now()}`,
        message: "현금영수증이 발행되었습니다.",
      });
    }

    if (!action && (req.method === "PATCH" || req.method === "PUT")) {
      const body = parseBody(req) || {};
      const totalAmount = Number(body.totalAmount ?? body.total_amount ?? target.totalAmount);
      const depositAmount = Number(body.depositAmount ?? body.deposit_amount ?? target.depositAmount);
      const balanceAmount = Number(
        body.balanceAmount ?? body.balance_amount ?? Math.max(0, totalAmount - depositAmount)
      );

      await convexClient.mutation(api.crm.upsertContract, {
        contractNo: target.contractNo,
        projectId: target.projectId,
        customerName: String(body.customerName || body.customer_name || target.customerName),
        customerPhone: String(body.customerPhone || body.customer_phone || target.customerPhone),
        status: String(body.status || target.status),
        totalAmount,
        depositAmount,
        balanceAmount,
        contractDate: body.contractDate || body.contract_date || target.contractDate,
        signedAt: body.signedAt || target.signedAt,
      });
      return res.status(200).json({ updated: true, message: "계약 정보가 수정되었습니다." });
    }

    if (!action && req.method === "DELETE") {
      await convexClient.mutation(api.crm.deleteContract, { contractNo: target.contractNo });
      return res.status(200).json({ deleted: true, message: "계약이 삭제되었습니다." });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[Vercel Convex] /api/contracts/[...slug] error:", err);
    return res.status(500).json({ error: "계약 처리 중 오류가 발생했습니다." });
  }
}
