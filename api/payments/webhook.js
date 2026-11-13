import { setCors, parseBody } from "../_lib/authHelper.js";
import { notifyNewContract } from "../_lib/discordHelper.js";
import {
  loadPaymentLedger,
  savePaymentLedger,
  loadPgConfig,
  markOrderPaidAndSyncContract,
  syncContractTotalsToConvex,
} from "../_lib/paymentLedger.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, message: "KCC Payment Webhook Endpoint Ready" });
  }

  try {
    const body = parseBody(req) || {};
    const pgConfig = await loadPgConfig();

    // 토스페이먼츠 웹훅 시크릿 설정 시 일치 여부 검증
    const paymentData = body.data || body;
    if (
      pgConfig.webhookSecret &&
      paymentData.secret &&
      String(paymentData.secret) !== String(pgConfig.webhookSecret)
    ) {
      return res.status(401).json({ error: "Invalid webhook secret" });
    }

    const orderId = String(paymentData.orderId || body.orderId || "").trim();
    const status = String(paymentData.status || body.status || "").toUpperCase();
    if (!orderId) {
      return res.status(200).json({ received: true, skipped: "no_order_id" });
    }

    const ledger = await loadPaymentLedger();
    const order = (ledger.paymentOrders || []).find((o) => o.orderId === orderId);
    if (!order) {
      return res.status(200).json({ received: true, skipped: "order_not_found" });
    }

    if (status === "DONE" && order.status !== "paid") {
      await markOrderPaidAndSyncContract(ledger, order, {
        pgProvider: "tosspayments",
        pgPaymentKey: String(paymentData.paymentKey || order.pgPaymentKey || ""),
        pgApprovalNo: String(paymentData.card?.approveNo || ""),
        cardCompany: String(
          paymentData.card?.company || paymentData.easyPay?.provider || "카드결제"
        ),
        installmentMonths: Number(
          paymentData.card?.installmentPlanMonths ?? order.installmentMonths ?? 0
        ),
        receiptUrl: String(paymentData.receipt?.url || ""),
      });
      await savePaymentLedger(ledger);

      await notifyNewContract({
        category: "카드결제 자동확인 (PG 웹훅)",
        contractNo: order.contractNo || order.orderId,
        customerName: order.customerName,
        phone: order.customerPhone,
        contractType: `카드 · ${order.phaseLabel}`,
        status: "결제완료",
        totalAmount: order.amount,
        depositAmount: order.amount,
        balanceAmount: 0,
        product: order.product || "창호",
        partnerName: order.partner || "직영",
      }).catch(() => {});
    } else if ((status === "CANCELED" || status === "ABORTED") && order.status === "paid") {
      order.status = "cancelled";
      order.cancelledAt = new Date().toISOString();
      order.updatedAt = order.cancelledAt;

      if (order.contractNo && ledger.contractMeta[order.contractNo]) {
        const meta = ledger.contractMeta[order.contractNo];
        const sch = (meta.schedules || []).find(
          (s) => s.paymentOrderId === order.orderId || s.id === order.scheduleId
        );
        if (sch) {
          sch.paid = false;
          sch.paidDate = "";
          sch.paidAt = "";
        }
        meta.updatedAt = new Date().toISOString();
        await syncContractTotalsToConvex(order.contractNo, meta, order);
      }
      await savePaymentLedger(ledger);
    }

    return res.status(200).json({ received: true, orderId, status });
  } catch (err) {
    console.error("[Vercel] POST /api/payments/webhook error:", err);
    return res.status(500).json({ error: "Webhook processing error" });
  }
}
