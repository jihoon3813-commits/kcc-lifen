import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
} from "../_lib/authHelper.js";
import { notifyNewContract } from "../_lib/discordHelper.js";
import {
  loadPaymentLedger,
  savePaymentLedger,
  loadPgConfig,
  savePgConfig,
  createPaymentOrderInLedger,
  markOrderPaidAndSyncContract,
  syncContractTotalsToConvex,
} from "../_lib/paymentLedger.js";

function maskPgConfig(cfg) {
  return {
    provider: cfg.provider || "tosspayments",
    merchantName: cfg.merchantName || "(주)라이프앤조이 · KCC홈씨씨",
    clientKey: cfg.clientKey || "",
    hasSecretKey: Boolean(cfg.secretKey),
    secretKeyMasked: cfg.secretKey ? "••••••••" : "",
    hasWebhookSecret: Boolean(cfg.webhookSecret),
    webhookSecretMasked: cfg.webhookSecret ? "••••••••" : "",
    liveReady: Boolean(cfg.liveReady),
    isTestKey: Boolean(cfg.isTestKey),
  };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }

  const isPartner = auth.user.role === "partner" && auth.user.org_name;

  if (req.method === "GET") {
    try {
      const [ledger, pgConfig] = await Promise.all([loadPaymentLedger(), loadPgConfig()]);
      const orders = (ledger.paymentOrders || []).filter(
        (o) => !isPartner || o.partner === auth.user.org_name
      );
      return res.status(200).json({
        orders,
        pgConfig: maskPgConfig(pgConfig),
      });
    } catch (err) {
      console.error("[Vercel] GET /api/payments error:", err);
      return res.status(500).json({ error: "카드결제 목록 조회 중 오류가 발생했습니다." });
    }
  }

  if (req.method === "POST") {
    const body = parseBody(req) || {};
    const action = String(body.action || "create").trim();

    try {
      if (action === "save-pg-config") {
        if (auth.user.role !== "hq_admin" && auth.user.username !== "admin") {
          return res.status(403).json({ error: "PG 연동 설정은 본사관리자만 변경할 수 있습니다." });
        }
        const saved = await savePgConfig(body);
        return res.status(200).json({
          ok: true,
          pgConfig: maskPgConfig(saved),
          message: "PG 연동 설정이 저장되었습니다.",
        });
      }

      const ledger = await loadPaymentLedger();

      if (action === "create") {
        const amount = Math.max(0, Number(body.amount || 0));
        if (amount <= 0) {
          return res.status(400).json({ error: "결제 요청 금액을 입력해 주세요." });
        }

        let proj = null;
        const projectId = Number(body.projectId || body.cid || 0);
        if (projectId > 0) {
          const detail = await convexClient
            .query(api.crm.getCustomerDetail, { projectId })
            .catch(() => null);
          proj = detail?.project || null;
        }

        const order = createPaymentOrderInLedger(ledger, {
          contractNo: String(body.contractNo || ""),
          projectId,
          customerName: String(body.customerName || proj?.customerName || "고객"),
          customerPhone: String(body.customerPhone || proj?.customerPhone || ""),
          customerAddress: String(body.customerAddress || proj?.customerAddress || ""),
          product: String(body.product || proj?.product || "창호"),
          partner: String(body.partner || proj?.partnerName || auth.user.org_name || "직영"),
          scheduleId: String(body.scheduleId || "full"),
          phaseLabel: String(body.phaseLabel || "일시납"),
          amount,
          installmentMonths: Math.max(0, Number(body.installmentMonths || 0)),
          memo: String(body.memo || ""),
        });

        await savePaymentLedger(ledger);
        return res.status(201).json({
          ok: true,
          order,
          message: "카드결제 링크가 생성되었습니다.",
        });
      }

      const targetOrder = ledger.paymentOrders.find(
        (o) => o.orderId === body.orderId || o.token === body.token
      );
      if (!targetOrder) {
        return res.status(404).json({ error: "결제 요청 건을 찾을 수 없습니다." });
      }

      if (action === "mark-sent") {
        targetOrder.sentCount = Number(targetOrder.sentCount || 0) + 1;
        targetOrder.lastSentAt = new Date().toISOString();
        targetOrder.updatedAt = targetOrder.lastSentAt;
        await savePaymentLedger(ledger);
        return res.status(200).json({ ok: true, order: targetOrder });
      }

      if (action === "manual-approve") {
        if (targetOrder.status === "paid") {
          return res.status(200).json({ ok: true, order: targetOrder, alreadyPaid: true });
        }
        await markOrderPaidAndSyncContract(ledger, targetOrder, {
          pgProvider: "admin_manual",
          pgApprovalNo: String(body.approvalNo || `ADM-${Date.now().toString().slice(-6)}`),
          cardCompany: String(body.cardCompany || "수기승인"),
        });
        await savePaymentLedger(ledger);

        await notifyNewContract({
          category: "카드결제 완료 (관리자 승인)",
          contractNo: targetOrder.contractNo || targetOrder.orderId,
          customerName: targetOrder.customerName,
          phone: targetOrder.customerPhone,
          contractType: `카드 · ${targetOrder.phaseLabel}${
            targetOrder.installmentMonths >= 2
              ? ` (${targetOrder.installmentMonths}개월 할부)`
              : " (일시불)"
          }`,
          status: "결제완료",
          totalAmount: targetOrder.amount,
          depositAmount: targetOrder.amount,
          balanceAmount: 0,
          product: targetOrder.product || "창호",
          partnerName: targetOrder.partner || "직영",
          address: targetOrder.customerAddress || "",
        }).catch(() => {});

        return res.status(200).json({
          ok: true,
          order: targetOrder,
          message: "결제완료 처리 및 계약관리 반영이 완료되었습니다.",
        });
      }

      if (action === "cancel") {
        const pgConfig = await loadPgConfig();
        if (
          targetOrder.status === "paid" &&
          pgConfig.liveReady &&
          targetOrder.pgPaymentKey &&
          targetOrder.pgProvider === "tosspayments"
        ) {
          const authHeader =
            "Basic " + Buffer.from(`${pgConfig.secretKey}:`).toString("base64");
          const cancelRes = await fetch(
            `https://api.tosspayments.com/v1/payments/${encodeURIComponent(
              targetOrder.pgPaymentKey
            )}/cancel`,
            {
              method: "POST",
              headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                cancelReason: String(body.cancelReason || "관리자 결제 취소"),
              }),
            }
          );
          if (!cancelRes.ok) {
            const errJson = await cancelRes.json().catch(() => ({}));
            return res.status(400).json({
              error: errJson.message || "PG사 결제 취소 요청에 실패했습니다.",
            });
          }
        }

        const wasPaid = targetOrder.status === "paid";
        targetOrder.status = "cancelled";
        targetOrder.cancelledAt = new Date().toISOString();
        targetOrder.updatedAt = targetOrder.cancelledAt;

        if (wasPaid && targetOrder.contractNo) {
          const meta = ledger.contractMeta[targetOrder.contractNo];
          if (meta && Array.isArray(meta.schedules)) {
            const sch = meta.schedules.find(
              (s) =>
                s.paymentOrderId === targetOrder.orderId || s.id === targetOrder.scheduleId
            );
            if (sch) {
              sch.paid = false;
              sch.paidDate = "";
              sch.paidAt = "";
            }
            meta.updatedAt = new Date().toISOString();
          }
          await syncContractTotalsToConvex(targetOrder.contractNo, meta, targetOrder);
        }

        await savePaymentLedger(ledger);
        return res.status(200).json({
          ok: true,
          order: targetOrder,
          message: wasPaid
            ? "결제 승인이 취소되었으며 계약관리 수납액에 반영되었습니다."
            : "결제 링크가 취소되었습니다.",
        });
      }

      return res.status(400).json({ error: "지원하지 않는 요청입니다." });
    } catch (err) {
      console.error("[Vercel] POST /api/payments error:", err);
      return res.status(500).json({ error: "카드결제 처리 중 오류가 발생했습니다." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
