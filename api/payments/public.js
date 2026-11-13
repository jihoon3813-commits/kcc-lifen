import { setCors, parseBody } from "../_lib/authHelper.js";
import { notifyNewContract } from "../_lib/discordHelper.js";
import {
  loadPaymentLedger,
  savePaymentLedger,
  loadPgConfig,
  markOrderPaidAndSyncContract,
} from "../_lib/paymentLedger.js";

function sanitizePublicOrder(order) {
  return {
    orderId: order.orderId,
    token: order.token,
    contractNo: order.contractNo,
    customerName: order.customerName,
    customerPhone: order.customerPhone
      ? order.customerPhone.replace(/(\d{3})-?(\d{2,4})-?(\d{4})/, "$1-****-$3")
      : "",
    product: order.product || "KCC 홈씨씨 창호",
    partner: order.partner || "(주)라이프앤조이",
    phaseLabel: order.phaseLabel || "일시납",
    amount: Number(order.amount || 0),
    installmentMonths: Number(order.installmentMonths || 0),
    status: order.status,
    approvedAtText: order.approvedAtText || "",
    pgApprovalNo: order.pgApprovalNo || "",
    cardCompany: order.cardCompany || "",
    receiptUrl: order.receiptUrl || "",
    memo: order.memo || "",
    createdAtText: order.createdAtText || "",
  };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method === "GET") {
    try {
      const urlObj = new URL(req.url || "/", "http://localhost");
      const token = String(req.query?.token || urlObj.searchParams.get("token") || "").trim();
      if (!token) {
        return res.status(400).json({ error: "결제 토큰이 필요합니다." });
      }

      const [ledger, pgConfig] = await Promise.all([loadPaymentLedger(), loadPgConfig()]);
      const order = (ledger.paymentOrders || []).find(
        (o) => o.token === token || o.orderId === token
      );
      if (!order) {
        return res.status(404).json({ error: "유효하지 않거나 만료된 결제 링크입니다." });
      }

      return res.status(200).json({
        order: sanitizePublicOrder(order),
        pg: {
          provider: pgConfig.provider || "tosspayments",
          merchantName: pgConfig.merchantName || "(주)라이프앤조이 · KCC홈씨씨",
          clientKey: pgConfig.liveReady ? pgConfig.clientKey : "",
          liveReady: Boolean(pgConfig.liveReady),
          isTestKey: Boolean(pgConfig.isTestKey),
        },
      });
    } catch (err) {
      console.error("[Vercel] GET /api/payments/public error:", err);
      return res.status(500).json({ error: "결제 정보 조회 중 오류가 발생했습니다." });
    }
  }

  if (req.method === "POST") {
    const body = parseBody(req) || {};
    const token = String(body.token || "").trim();
    if (!token) {
      return res.status(400).json({ error: "결제 토큰이 누락되었습니다." });
    }

    try {
      const [ledger, pgConfig] = await Promise.all([loadPaymentLedger(), loadPgConfig()]);
      const order = (ledger.paymentOrders || []).find(
        (o) => o.token === token || o.orderId === body.orderId
      );
      if (!order) {
        return res.status(404).json({ error: "결제 요청 내역을 찾을 수 없습니다." });
      }
      if (order.status === "cancelled") {
        return res.status(400).json({ error: "취소된 결제 링크입니다. 담당자에게 새 링크를 요청해 주세요." });
      }
      if (order.status === "paid") {
        return res.status(200).json({
          ok: true,
          alreadyPaid: true,
          order: sanitizePublicOrder(order),
        });
      }

      const reqAmount = Number(body.amount ?? order.amount);
      if (reqAmount !== Number(order.amount)) {
        return res.status(400).json({ error: "결제 금액이 요청된 금액과 일치하지 않습니다." });
      }

      let approvalInfo = null;

      if (pgConfig.liveReady && body.paymentKey) {
        const authHeader =
          "Basic " + Buffer.from(`${pgConfig.secretKey}:`).toString("base64");
        const confirmRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentKey: String(body.paymentKey),
            orderId: order.orderId,
            amount: Number(order.amount),
          }),
        });
        const confirmJson = await confirmRes.json().catch(() => ({}));
        if (!confirmRes.ok) {
          return res.status(400).json({
            error: confirmJson.message || "카드사 결제 승인에 실패했습니다.",
            code: confirmJson.code || "PG_CONFIRM_FAILED",
          });
        }
        approvalInfo = {
          pgProvider: "tosspayments",
          pgPaymentKey: String(confirmJson.paymentKey || body.paymentKey),
          pgApprovalNo: String(confirmJson.card?.approveNo || ""),
          cardCompany: String(confirmJson.card?.company || confirmJson.easyPay?.provider || "카드결제"),
          installmentMonths: Number(
            confirmJson.card?.installmentPlanMonths ?? order.installmentMonths ?? 0
          ),
          receiptUrl: String(confirmJson.receipt?.url || ""),
        };
      } else if (!pgConfig.liveReady && body.mode === "test_confirm") {
        approvalInfo = {
          pgProvider: "test_simulation",
          pgPaymentKey: `test_pk_${Date.now()}`,
          pgApprovalNo: `TEST-${Date.now().toString().slice(-6)}`,
          cardCompany: String(body.cardCompany || "테스트카드"),
          installmentMonths:
            body.installmentMonths !== undefined
              ? Number(body.installmentMonths)
              : order.installmentMonths,
          receiptUrl: "",
        };
      } else {
        return res.status(400).json({
          error: "PG 결제 승인 키(paymentKey)가 누락되었습니다.",
        });
      }

      await markOrderPaidAndSyncContract(ledger, order, approvalInfo);
      await savePaymentLedger(ledger);

      await notifyNewContract({
        category: "온라인 카드결제 완료",
        contractNo: order.contractNo || order.orderId,
        customerName: order.customerName,
        phone: order.customerPhone,
        contractType: `카드결제 · ${order.phaseLabel}${
          order.installmentMonths >= 2 ? ` (${order.installmentMonths}개월 할부)` : " (일시불)"
        }`,
        status: "결제완료",
        totalAmount: order.amount,
        depositAmount: order.amount,
        balanceAmount: 0,
        product: order.product || "창호",
        partnerName: order.partner || "직영",
        address: order.customerAddress || "",
      }).catch(() => {});

      return res.status(200).json({
        ok: true,
        order: sanitizePublicOrder(order),
        message: "카드결제가 정상적으로 완료되었습니다.",
      });
    } catch (err) {
      console.error("[Vercel] POST /api/payments/public error:", err);
      return res.status(500).json({ error: "결제 승인 처리 중 오류가 발생했습니다." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
