import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
  extractSlug,
} from "../_lib/authHelper.js";
import { formatKstDateSlice } from "../_lib/crmHelper.js";
import {
  loadPaymentLedger,
  savePaymentLedger,
  buildContractPaymentMeta,
  computeConfirmedPaidAmount,
  createPaymentOrderInLedger,
  syncContractTotalsToConvex,
} from "../_lib/paymentLedger.js";

function ensureContractMeta(ledger, target, rentalApp) {
  if (ledger.contractMeta[target.contractNo]) {
    return ledger.contractMeta[target.contractNo];
  }
  const isRental =
    Boolean(rentalApp) ||
    String(target.contractNo || "").startsWith("R-") ||
    String(target.status || "").includes("렌탈");

  let meta;
  if (isRental) {
    const months = Number(rentalApp?.rentalPeriod || 60);
    const monthly = Number(rentalApp?.monthlyFee || 111000);
    const total = Number(target.totalAmount || rentalApp?.totalRentalFee || monthly * months);
    const upfront = Math.max(0, total - monthly * months);
    meta = {
      contractNo: target.contractNo,
      projectId: Number(target.projectId),
      payCategory: "rental",
      payOption: "rental60",
      installmentMonths: 0,
      quoteTotal: total,
      rentalMonths: months,
      rentalMonthly: monthly,
      rentalUpfront: upfront,
      rentalTotalFee: total,
      rentalUpfrontMethod: "cash",
      rentalUpfrontInstallmentMonths: 0,
      schedules:
        upfront > 0
          ? [
              {
                id: "upfront",
                label: "초기납입금",
                method: "cash",
                installmentMonths: 0,
                amount: upfront,
                paid: false,
                paidDate: "",
                paidAt: "",
                paymentOrderId: "",
              },
            ]
          : [],
      updatedAt: new Date().toISOString(),
    };
  } else {
    const totalAmt = Number(target.totalAmount || 0);
    const depAmt = Number(target.depositAmount || 0);
    const isFullPaid = totalAmt > 0 && depAmt >= totalAmt;
    if (depAmt > 0 && depAmt < totalAmt) {
      meta = {
        contractNo: target.contractNo,
        projectId: Number(target.projectId),
        payCategory: "cash",
        payOption: "deposit",
        installmentMonths: 0,
        quoteTotal: totalAmt,
        depositAmount: depAmt,
        balanceAmount: Math.max(0, totalAmt - depAmt),
        schedules: [
          {
            id: "deposit",
            label: "선금",
            method: "cash",
            installmentMonths: 0,
            amount: depAmt,
            paid: true,
            paidDate: target.contractDate || "",
            paidAt: target.signedAt || "",
            paymentOrderId: "",
          },
          {
            id: "balance",
            label: "잔금",
            method: "cash",
            installmentMonths: 0,
            amount: Math.max(0, totalAmt - depAmt),
            paid: false,
            paidDate: "",
            paidAt: "",
            paymentOrderId: "",
          },
        ],
        updatedAt: new Date().toISOString(),
      };
    } else {
      meta = {
        contractNo: target.contractNo,
        projectId: Number(target.projectId),
        payCategory: "cash",
        payOption: "full",
        installmentMonths: 0,
        quoteTotal: totalAmt,
        schedules: [
          {
            id: "full",
            label: "일시납",
            method: "cash",
            installmentMonths: 0,
            amount: totalAmt,
            paid: isFullPaid,
            paidDate: isFullPaid ? target.contractDate || "" : "",
            paidAt: isFullPaid ? target.signedAt || "" : "",
            paymentOrderId: "",
          },
        ],
        updatedAt: new Date().toISOString(),
      };
    }
  }
  ledger.contractMeta[target.contractNo] = meta;
  return meta;
}

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
    const projects = data.projects || [];
    let target = (data.contracts || []).find(
      (c) =>
        c.contractNo === contractId ||
        String(c.projectId) === contractId ||
        String(c._id) === contractId
    );
    let rentalApp = null;
    if (!target) {
      rentalApp = await convexClient.query(api.rentals.getByAppNo, { appNo: contractId });
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
          depositAmount: 0,
          balanceAmount: Math.max(0, total - upfront),
          contractDate: rentalApp.createdAt ? rentalApp.createdAt.slice(0, 10) : "",
          signedAt: rentalApp.createdAt || "",
        };
      }
    } else if (String(target.contractNo || "").startsWith("R-")) {
      rentalApp = await convexClient
        .query(api.rentals.getByAppNo, { appNo: target.contractNo })
        .catch(() => null);
    }

    if (!target) {
      return res.status(404).json({ error: "계약을 찾을 수 없습니다." });
    }

    const proj = projects.find((p) => Number(p.projectId) === Number(target.projectId));

    // 현금 입금완료 체크 및 입금일 기록
    if (action === "cash-check" && (req.method === "POST" || req.method === "PATCH")) {
      const body = parseBody(req) || {};
      const ledger = await loadPaymentLedger();
      const meta = ensureContractMeta(ledger, target, rentalApp);
      const todayKst = formatKstDateSlice(new Date().toISOString());
      const scheduleId = String(body.scheduleId || "").trim();

      let sch = scheduleId
        ? meta.schedules.find((s) => s.id === scheduleId)
        : meta.schedules.find((s) => s.method === "cash") || meta.schedules[0];

      if (!sch) {
        sch = {
          id: scheduleId || (meta.payCategory === "rental" ? "upfront" : "full"),
          label: meta.payCategory === "rental" ? "초기납입금" : "일시납",
          method: "cash",
          installmentMonths: 0,
          amount: Number(body.amount || meta.rentalUpfront || meta.quoteTotal || 0),
          paid: false,
          paidDate: "",
          paidAt: "",
          paymentOrderId: "",
        };
        meta.schedules.push(sch);
      }

      if (body.amount !== undefined && Number(body.amount) >= 0) {
        sch.amount = Number(body.amount);
        if (meta.payCategory === "rental") {
          if (sch.id === "upfront") {
            meta.rentalUpfront = sch.amount;
            meta.rentalTotalFee =
              Number(meta.rentalMonthly || 111000) * Number(meta.rentalMonths || 60) +
              sch.amount;
          }
        } else if (Array.isArray(meta.schedules) && meta.schedules.length > 0) {
          const sumAmt = meta.schedules.reduce((acc, s) => acc + Number(s.amount || 0), 0);
          if (sumAmt > 0) {
            meta.quoteTotal = sumAmt;
            const depSch = meta.schedules.find((s) => s.id === "deposit");
            const balSch = meta.schedules.find((s) => s.id === "balance");
            if (depSch) meta.depositAmount = Number(depSch.amount || 0);
            if (balSch) meta.balanceAmount = Number(balSch.amount || 0);
          }
        }
      }
      const nextPaid = Boolean(body.paid);
      const nextDate = String(body.paidDate || todayKst).slice(0, 10) || todayKst;
      sch.paid = nextPaid;
      sch.paidDate = nextPaid ? nextDate : "";
      sch.paidAt = nextPaid ? new Date().toISOString() : "";
      meta.updatedAt = new Date().toISOString();

      await savePaymentLedger(ledger);
      const totals = await syncContractTotalsToConvex(target.contractNo, meta);

      return res.status(200).json({
        ok: true,
        contractNo: target.contractNo,
        schedule: sch,
        meta,
        totals,
        message: nextPaid
          ? `${sch.label} 입금완료(${nextDate})가 반영되었습니다.`
          : `${sch.label} 입금확인 체크가 해제되었습니다.`,
      });
    }

    // 계약 건에서 카드 결제링크 생성 / 조회
    if (action === "card-link" && req.method === "POST") {
      const body = parseBody(req) || {};
      const ledger = await loadPaymentLedger();
      const meta = ensureContractMeta(ledger, target, rentalApp);
      const scheduleId = String(body.scheduleId || "").trim();
      const sch =
        (scheduleId && meta.schedules.find((s) => s.id === scheduleId)) || meta.schedules[0];

      const reqAmount = Math.max(
        0,
        Number(body.amount ?? sch?.amount ?? target.balanceAmount ?? target.totalAmount ?? 0)
      );
      if (reqAmount <= 0) {
        return res.status(400).json({ error: "결제 요청 금액이 0원보다 커야 합니다." });
      }

      const targetScheduleId = scheduleId || sch?.id || "full";
      const reqInstallment = Number(
        body.installmentMonths ?? sch?.installmentMonths ?? meta.installmentMonths ?? 0
      );

      if (body.reuseExisting !== false) {
        const existingOrder = ledger.paymentOrders.find(
          (o) =>
            o.contractNo === target.contractNo &&
            o.scheduleId === targetScheduleId &&
            o.status === "pending" &&
            Number(o.amount) === reqAmount &&
            Number(o.installmentMonths || 0) === reqInstallment
        );
        if (existingOrder) {
          return res.status(200).json({
            ok: true,
            reused: true,
            order: existingOrder,
            message: "기존 카드결제 링크를 불러왔습니다.",
          });
        }
      }

      const order = createPaymentOrderInLedger(ledger, {
        contractNo: target.contractNo,
        projectId: target.projectId,
        customerName: target.customerName || proj?.customerName || "고객",
        customerPhone: target.customerPhone || proj?.customerPhone || "",
        customerAddress: proj?.customerAddress || "",
        product: proj?.product || "창호",
        partner: proj?.partnerName || "직영",
        scheduleId: targetScheduleId,
        phaseLabel: String(body.phaseLabel || sch?.label || "카드결제"),
        amount: reqAmount,
        installmentMonths: reqInstallment,
        memo: String(body.memo || meta.note || ""),
      });

      await savePaymentLedger(ledger);
      return res.status(200).json({
        ok: true,
        order,
        message: "카드결제 링크가 생성되었습니다.",
      });
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
        status: nextBalance === 0 ? "완납" : "선금완료",
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
      const nowIso = new Date().toISOString();
      const customerName = String(
        body.customerName || body.customer_name || target.customerName || proj?.customerName || ""
      );
      const customerPhone = String(
        body.customerPhone ||
          body.customer_phone ||
          target.customerPhone ||
          proj?.customerPhone ||
          ""
      );
      const contractDate = String(
        body.contractDate || body.contract_date || target.contractDate || formatKstDateSlice(nowIso)
      );

      if (body.updatePaymentTerms || body.payCategory !== undefined) {
        const ledger = await loadPaymentLedger();
        const prevMeta = ensureContractMeta(ledger, target, rentalApp);
        const quoteTotal = Math.max(
          0,
          Number(
            body.quoteTotal ??
              body.totalAmount ??
              body.amount ??
              prevMeta.quoteTotal ??
              target.totalAmount ??
              0
          )
        );

        const nextMeta = buildContractPaymentMeta({
          ...body,
          contractNo: target.contractNo,
          projectId: target.projectId,
          quoteTotal,
        });
        nextMeta.createdAt = prevMeta.createdAt || nextMeta.createdAt;
        nextMeta.updatedAt = nowIso;
        nextMeta.note =
          body.note !== undefined ? String(body.note || "").trim() : String(prevMeta.note || "");

        // 이미 카드결제 승인(paid)이 완료된 내역이 있으면 보존
        for (const sch of nextMeta.schedules || []) {
          const prevSch = (prevMeta.schedules || []).find((p) => p.id === sch.id);
          const paidCardOrder = (ledger.paymentOrders || []).find(
            (o) =>
              o.contractNo === target.contractNo &&
              o.status === "paid" &&
              (o.orderId === prevSch?.paymentOrderId || o.scheduleId === sch.id)
          );
          if (paidCardOrder && sch.method === "card") {
            sch.paid = true;
            sch.paidDate =
              prevSch?.paidDate || formatKstDateSlice(paidCardOrder.approvedAt || nowIso);
            sch.paidAt = prevSch?.paidAt || paidCardOrder.approvedAt || nowIso;
            sch.paymentOrderId = paidCardOrder.orderId;
          }
        }

        // 카드 일정 동기화: 기존 대기중(pending) 카드결제 주문 금액/할부 업데이트 또는 신규 생성, 불필요해진 대기 주문 취소
        const activeCardSchedules = (nextMeta.schedules || []).filter(
          (s) => s.method === "card" && !s.paid && Number(s.amount || 0) > 0
        );
        const activeCardIds = new Set(activeCardSchedules.map((s) => s.id));

        for (const ord of ledger.paymentOrders || []) {
          if (ord.contractNo === target.contractNo && ord.status === "pending") {
            if (!activeCardIds.has(ord.scheduleId)) {
              ord.status = "cancelled";
              ord.cancelledAt = nowIso;
              ord.updatedAt = nowIso;
            }
          }
        }

        ledger.contractMeta[target.contractNo] = nextMeta;

        let activeOrder = null;
        const primaryCardTargetId =
          nextMeta.payCategory === "card"
            ? nextMeta.payOption === "balance"
              ? "balance"
              : nextMeta.payOption === "deposit"
              ? "deposit"
              : "full"
            : nextMeta.payCategory === "rental" && nextMeta.rentalUpfrontMethod === "card"
            ? "upfront"
            : "";

        for (const sch of activeCardSchedules) {
          const existingPending = (ledger.paymentOrders || []).find(
            (o) =>
              o.contractNo === target.contractNo &&
              o.scheduleId === sch.id &&
              o.status === "pending"
          );
          const nextPhaseLabel = sch.id === "upfront" ? "렌탈 초기납입금" : sch.label || "카드결제";
          const nextInst = Number(
            sch.installmentMonths ??
              (sch.id === "upfront"
                ? nextMeta.rentalUpfrontInstallmentMonths
                : nextMeta.installmentMonths) ??
              0
          );
          if (existingPending) {
            existingPending.amount = Number(sch.amount || 0);
            existingPending.installmentMonths = nextInst;
            existingPending.phaseLabel = nextPhaseLabel;
            existingPending.customerName = customerName || existingPending.customerName;
            existingPending.customerPhone = customerPhone || existingPending.customerPhone;
            existingPending.memo = nextMeta.note || existingPending.memo || "";
            existingPending.updatedAt = nowIso;
            sch.paymentOrderId = existingPending.orderId;
            if (!activeOrder || sch.id === primaryCardTargetId) activeOrder = existingPending;
          } else if (sch.id === primaryCardTargetId || activeCardSchedules.length === 1) {
            const created = createPaymentOrderInLedger(ledger, {
              contractNo: target.contractNo,
              projectId: target.projectId,
              customerName: customerName || "고객",
              customerPhone,
              customerAddress: proj?.customerAddress || "",
              product: proj?.product || "창호",
              partner: proj?.partnerName || "직영",
              scheduleId: sch.id,
              phaseLabel: nextPhaseLabel,
              amount: Number(sch.amount || 0),
              installmentMonths: nextInst,
              memo: nextMeta.note || "",
            });
            if (!activeOrder || sch.id === primaryCardTargetId) activeOrder = created;
          }
        }

        await savePaymentLedger(ledger);

        const confirmedPaid = computeConfirmedPaidAmount(
          nextMeta,
          0,
          nextMeta.payCategory === "rental"
        );
        const effectiveTotal =
          nextMeta.payCategory === "rental"
            ? Number(nextMeta.rentalTotalFee || quoteTotal)
            : quoteTotal;
        const nextBalance = Math.max(0, effectiveTotal - confirmedPaid);

        let nextStatus = String(body.status || "").trim();
        if (!nextStatus) {
          if (nextMeta.payCategory === "rental") {
            nextStatus = confirmedPaid > 0 ? "초기납입완료" : "약정대기";
          } else if (confirmedPaid >= effectiveTotal && effectiveTotal > 0) {
            nextStatus = "수납완료";
          } else if (confirmedPaid > 0) {
            nextStatus = "선금완료";
          } else {
            nextStatus = "미수납";
          }
        }

        await convexClient.mutation(api.crm.upsertContract, {
          contractNo: target.contractNo,
          projectId: target.projectId,
          customerName,
          customerPhone,
          status: nextStatus,
          totalAmount: effectiveTotal,
          depositAmount: confirmedPaid,
          balanceAmount: nextBalance,
          contractDate,
          signedAt: confirmedPaid > 0 ? target.signedAt || nowIso : target.signedAt,
        });

        if (nextMeta.payCategory === "rental") {
          await convexClient
            .mutation(api.rentals.upsertApplication, {
              appNo: rentalApp?.appNo || target.contractNo,
              projectId: target.projectId,
              customerName,
              customerPhone,
              installationAddress: rentalApp?.installationAddress || proj?.customerAddress || "",
              productSummary: `KCC 홈씨씨 ${proj?.product || "창호"} (${nextMeta.rentalMonths || 60}개월 · 월 ${Number(nextMeta.rentalMonthly || 111000).toLocaleString("ko-KR")}원)`,
              monthlyFee: Number(nextMeta.rentalMonthly || 111000),
              rentalPeriod: Number(nextMeta.rentalMonths || 60),
              totalRentalFee: effectiveTotal,
              status: rentalApp?.status || "received",
              underwritingMemo: nextMeta.note || rentalApp?.underwritingMemo || "",
            })
            .catch(() => {});
        }

        return res.status(200).json({
          updated: true,
          contractNo: target.contractNo,
          meta: nextMeta,
          paymentOrder: activeOrder,
          message: "결제방식 및 계약금액이 수정되었습니다.",
        });
      }

      const totalAmount = Number(body.totalAmount ?? body.total_amount ?? target.totalAmount);
      const depositAmount = Number(
        body.depositAmount ?? body.deposit_amount ?? target.depositAmount
      );
      const balanceAmount = Number(
        body.balanceAmount ?? body.balance_amount ?? Math.max(0, totalAmount - depositAmount)
      );

      if (body.note !== undefined || body.totalAmount !== undefined) {
        const ledger = await loadPaymentLedger();
        const meta = ensureContractMeta(ledger, target, rentalApp);
        if (body.note !== undefined) meta.note = String(body.note || "").trim();
        if (body.totalAmount !== undefined && meta.payCategory !== "rental") {
          meta.quoteTotal = totalAmount;
        }
        meta.updatedAt = nowIso;
        await savePaymentLedger(ledger);
      }

      await convexClient.mutation(api.crm.upsertContract, {
        contractNo: target.contractNo,
        projectId: target.projectId,
        customerName,
        customerPhone,
        status: String(body.status || target.status),
        totalAmount,
        depositAmount,
        balanceAmount,
        contractDate,
        signedAt: body.signedAt || target.signedAt,
      });
      return res.status(200).json({ updated: true, message: "계약 정보가 수정되었습니다." });
    }

    if (!action && req.method === "DELETE") {
      const ledger = await loadPaymentLedger();
      delete ledger.contractMeta[target.contractNo];
      ledger.paymentOrders = ledger.paymentOrders.map((o) =>
        o.contractNo === target.contractNo && o.status === "pending"
          ? { ...o, status: "cancelled", cancelledAt: new Date().toISOString() }
          : o
      );
      await savePaymentLedger(ledger);
      await convexClient
        .mutation(api.crm.deleteContract, { contractNo: target.contractNo })
        .catch(() => {});
      return res.status(200).json({ deleted: true, message: "계약이 삭제되었습니다." });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[Vercel Convex] /api/contracts/[...slug] error:", err);
    return res.status(500).json({ error: "계약 처리 중 오류가 발생했습니다." });
  }
}
