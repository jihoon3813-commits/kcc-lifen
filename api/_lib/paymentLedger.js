import crypto from "node:crypto";
import { api } from "../../convex/_generated/api.js";
import { convexClient } from "./authHelper.js";
import { formatKstDateSlice, formatShortKst } from "./crmHelper.js";

const LEDGER_SETTING_KEY = "crm_payment_ledger_v1";
const PG_CONFIG_SETTING_KEY = "crm_pg_config_v1";

export function createEmptyLedger() {
  return {
    version: 1,
    contractMeta: {},
    paymentOrders: [],
  };
}

export async function loadPaymentLedger() {
  try {
    const doc = await convexClient.query(api.settings.getSetting, {
      key: LEDGER_SETTING_KEY,
    });
    if (doc?.value) {
      const parsed = JSON.parse(doc.value);
      return {
        version: 1,
        contractMeta:
          parsed && typeof parsed.contractMeta === "object" && parsed.contractMeta
            ? parsed.contractMeta
            : {},
        paymentOrders: Array.isArray(parsed?.paymentOrders) ? parsed.paymentOrders : [],
      };
    }
  } catch (err) {
    console.error("[paymentLedger] loadPaymentLedger error:", err);
  }
  return createEmptyLedger();
}

export async function savePaymentLedger(ledger) {
  const safe = {
    version: 1,
    contractMeta: ledger?.contractMeta || {},
    paymentOrders: Array.isArray(ledger?.paymentOrders)
      ? ledger.paymentOrders.slice(0, 1000)
      : [],
  };
  await convexClient.mutation(api.settings.setSetting, {
    key: LEDGER_SETTING_KEY,
    value: JSON.stringify(safe),
  });
  return safe;
}

export async function loadPgConfig() {
  const envClientKey = process.env.TOSS_CLIENT_KEY || "";
  const envSecretKey = process.env.TOSS_SECRET_KEY || "";
  const envWebhookSecret = process.env.TOSS_WEBHOOK_SECRET || "";
  let stored = {};
  try {
    const doc = await convexClient.query(api.settings.getSetting, {
      key: PG_CONFIG_SETTING_KEY,
    });
    if (doc?.value) {
      stored = JSON.parse(doc.value) || {};
    }
  } catch {}
  const clientKey = String(stored.clientKey || envClientKey || "").trim();
  const secretKey = String(stored.secretKey || envSecretKey || "").trim();
  const webhookSecret = String(stored.webhookSecret || envWebhookSecret || "").trim();
  const provider = String(stored.provider || "tosspayments").trim();
  const merchantName = String(stored.merchantName || "(주)라이프앤조이 · KCC홈씨씨").trim();
  const liveReady = Boolean(clientKey && secretKey);
  return {
    provider,
    merchantName,
    clientKey,
    secretKey,
    webhookSecret,
    liveReady,
    isTestKey: clientKey.startsWith("test_"),
  };
}

export async function savePgConfig(input = {}) {
  const current = await loadPgConfig();
  const next = {
    provider: String(input.provider || current.provider || "tosspayments").trim(),
    merchantName: String(
      input.merchantName ?? current.merchantName ?? "(주)라이프앤조이 · KCC홈씨씨"
    ).trim(),
    clientKey:
      input.clientKey !== undefined ? String(input.clientKey).trim() : current.clientKey,
    secretKey:
      input.secretKey !== undefined && String(input.secretKey).trim() !== "••••••••"
        ? String(input.secretKey).trim()
        : current.secretKey,
    webhookSecret:
      input.webhookSecret !== undefined && String(input.webhookSecret).trim() !== "••••••••"
        ? String(input.webhookSecret).trim()
        : current.webhookSecret,
  };
  await convexClient.mutation(api.settings.setSetting, {
    key: PG_CONFIG_SETTING_KEY,
    value: JSON.stringify(next),
  });
  return {
    ...next,
    liveReady: Boolean(next.clientKey && next.secretKey),
    isTestKey: next.clientKey.startsWith("test_"),
  };
}

export function calcRentalDefaultUpfront(quoteTotal, monthlyFee) {
  const total = Math.max(0, Number(quoteTotal) || 0);
  const mo = Number(monthlyFee) || 111000;
  if (mo === 111000) return Math.max(0, total - 5000000);
  if (mo === 222000) return Math.max(0, total - 10000000);
  if (mo === 333000) return Math.max(0, total - 15000000);
  // 직접입력 월납입금인 경우: 총액 기준 차액(음수 방지)
  return Math.max(0, total - Math.round((mo / 111000) * 5000000));
}

export function buildContractPaymentMeta(input = {}) {
  const nowIso = new Date().toISOString();
  const todayKst = formatKstDateSlice(nowIso);
  const contractNo = String(input.contractNo || "").trim();
  const projectId = Number(input.projectId || input.cid || 0);

  let payCategory = String(input.payCategory || "").trim().toLowerCase();
  if (!["cash", "card", "rental"].includes(payCategory)) {
    const rawType = String(input.type || "");
    if (rawType.includes("렌탈") || contractNo.startsWith("R-")) payCategory = "rental";
    else if (rawType.includes("카드")) payCategory = "card";
    else payCategory = "cash";
  }

  const quoteTotal = Math.max(0, Number(input.quoteTotal ?? input.totalAmount ?? input.amount ?? 0));
  const cashPaid = Boolean(input.cashPaid);
  const cashPaidDate = String(input.cashPaidDate || todayKst).slice(0, 10) || todayKst;

  if (payCategory === "rental") {
    const rentalMonths = Number(input.rentalMonths || 60) || 60;
    const rentalMonthly = Math.max(0, Number(input.rentalMonthly || 111000));
    const rentalUpfront =
      input.rentalUpfront !== undefined && input.rentalUpfront !== null && input.rentalUpfront !== ""
        ? Math.max(0, Number(input.rentalUpfront))
        : calcRentalDefaultUpfront(quoteTotal, rentalMonthly);
    const rentalUpfrontMethod =
      String(input.rentalUpfrontMethod || "cash").toLowerCase() === "card" ? "card" : "cash";
    const rentalUpfrontInstallmentMonths =
      rentalUpfrontMethod === "card"
        ? Math.max(0, Number(input.rentalUpfrontInstallmentMonths || 0))
        : 0;

    const schedules =
      rentalUpfront > 0
        ? [
            {
              id: "upfront",
              label: "초기납입금",
              method: rentalUpfrontMethod,
              installmentMonths: rentalUpfrontInstallmentMonths,
              amount: rentalUpfront,
              paid: rentalUpfrontMethod === "cash" ? cashPaid : false,
              paidDate: rentalUpfrontMethod === "cash" && cashPaid ? cashPaidDate : "",
              paidAt: rentalUpfrontMethod === "cash" && cashPaid ? nowIso : "",
              paymentOrderId: "",
            },
          ]
        : [];

    return {
      contractNo,
      projectId,
      payCategory: "rental",
      payOption: "rental60",
      installmentMonths: 0,
      quoteTotal,
      rentalMonths,
      rentalMonthly,
      rentalUpfront,
      rentalTotalFee: rentalUpfront + rentalMonthly * rentalMonths,
      rentalUpfrontMethod,
      rentalUpfrontInstallmentMonths,
      schedules,
      updatedAt: nowIso,
    };
  }

  const payOptionRaw = String(input.payOption || "full").trim().toLowerCase();
  const payOption = ["full", "installment", "deposit", "balance"].includes(payOptionRaw)
    ? payOptionRaw
    : "full";
  const installmentMonths =
    payCategory === "card" ? Math.max(0, Number(input.installmentMonths || 0)) : 0;

  const defaultDeposit = Math.round(quoteTotal / 2);
  const depositAmt =
    input.depositAmount !== undefined && input.depositAmount !== null && input.depositAmount !== ""
      ? Math.max(0, Number(input.depositAmount))
      : defaultDeposit;
  const balanceAmt =
    input.balanceAmount !== undefined && input.balanceAmount !== null && input.balanceAmount !== ""
      ? Math.max(0, Number(input.balanceAmount))
      : Math.max(0, quoteTotal - depositAmt);

  let schedules = [];
  if (payOption === "full" || payOption === "installment") {
    const fullLabel =
      payCategory === "card"
        ? installmentMonths >= 2
          ? `일시납(${installmentMonths}개월 할부)`
          : "일시납(일시불)"
        : "일시납";
    schedules = [
      {
        id: "full",
        label: fullLabel,
        method: payCategory,
        installmentMonths,
        amount: quoteTotal,
        paid: payCategory === "cash" ? cashPaid : false,
        paidDate: payCategory === "cash" && cashPaid ? cashPaidDate : "",
        paidAt: payCategory === "cash" && cashPaid ? nowIso : "",
        paymentOrderId: "",
      },
    ];
  } else if (payOption === "deposit") {
    schedules = [
      {
        id: "deposit",
        label: "선금",
        method: payCategory,
        installmentMonths,
        amount: depositAmt,
        paid: payCategory === "cash" ? cashPaid : false,
        paidDate: payCategory === "cash" && cashPaid ? cashPaidDate : "",
        paidAt: payCategory === "cash" && cashPaid ? nowIso : "",
        paymentOrderId: "",
      },
      {
        id: "balance",
        label: "잔금",
        method: payCategory,
        installmentMonths: 0,
        amount: balanceAmt,
        paid: false,
        paidDate: "",
        paidAt: "",
        paymentOrderId: "",
      },
    ];
  } else {
    // payOption === 'balance'
    const priorDepositPaid = Boolean(input.priorDepositPaid);
    schedules = [
      {
        id: "deposit",
        label: "선금",
        method: payCategory,
        installmentMonths: 0,
        amount: depositAmt,
        paid: priorDepositPaid,
        paidDate: priorDepositPaid ? String(input.priorDepositPaidDate || cashPaidDate).slice(0, 10) : "",
        paidAt: priorDepositPaid ? nowIso : "",
        paymentOrderId: "",
      },
      {
        id: "balance",
        label: "잔금",
        method: payCategory,
        installmentMonths,
        amount: balanceAmt,
        paid: payCategory === "cash" ? cashPaid : false,
        paidDate: payCategory === "cash" && cashPaid ? cashPaidDate : "",
        paidAt: payCategory === "cash" && cashPaid ? nowIso : "",
        paymentOrderId: "",
      },
    ];
  }

  return {
    contractNo,
    projectId,
    payCategory,
    payOption,
    installmentMonths,
    quoteTotal,
    depositAmount: depositAmt,
    balanceAmount: balanceAmt,
    schedules,
    updatedAt: nowIso,
  };
}

export function formatPayMethodDisplay(meta, fallbackType = "일시불") {
  if (!meta) return { badgeText: fallbackType, subText: "" };
  if (meta.payCategory === "rental") {
    const upM =
      meta.rentalUpfront > 0
        ? meta.rentalUpfrontMethod === "card"
          ? meta.rentalUpfrontInstallmentMonths >= 2
            ? `초기납입 카드(${meta.rentalUpfrontInstallmentMonths}개월)`
            : "초기납입 카드(일시불)"
          : "초기납입 현금"
        : "초기납입 없음";
    return {
      badgeText: "렌탈",
      subText: `${meta.rentalMonths || 60}개월 · ${upM}`,
    };
  }
  if (meta.payCategory === "card") {
    const optMap = {
      full: "일시납",
      installment: "일시납(할부)",
      deposit: "선금·잔금",
      balance: "잔금",
    };
    const quotaText =
      meta.installmentMonths >= 2 ? ` · ${meta.installmentMonths}개월 할부` : " · 일시불";
    return {
      badgeText: "카드",
      subText: `${optMap[meta.payOption] || "일시납"}${quotaText}`,
    };
  }
  const cashOptMap = {
    full: "일시납",
    deposit: "선금·잔금",
    balance: "잔금",
  };
  return {
    badgeText: "현금",
    subText: cashOptMap[meta.payOption] || "일시납",
  };
}

export function computeConfirmedPaidAmount(meta, fallbackPaid = 0, isRentalFallback = false) {
  if (!meta || !Array.isArray(meta.schedules)) {
    // 렌탈인데 별도 수납 메타가 없으면 미입금 선납 예정액이 실제 수납액으로 잡히지 않도록 0 처리
    return isRentalFallback ? 0 : Math.max(0, Number(fallbackPaid) || 0);
  }
  return meta.schedules
    .filter((s) => Boolean(s.paid))
    .reduce((sum, s) => sum + Math.max(0, Number(s.amount) || 0), 0);
}

export function createPaymentOrderInLedger(ledger, params = {}) {
  const nowIso = new Date().toISOString();
  const todayCompact = formatKstDateSlice(nowIso).replace(/-/g, "");
  const randSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  const orderId = params.orderId || `PAY-${todayCompact}-${randSuffix}`;
  const token = params.token || `pay_${crypto.randomBytes(12).toString("hex")}`;
  const installmentMonths = Math.max(0, Number(params.installmentMonths || 0));
  const amount = Math.max(0, Number(params.amount || 0));

  const order = {
    orderId,
    token,
    contractNo: String(params.contractNo || ""),
    projectId: Number(params.projectId || 0),
    customerName: String(params.customerName || "고객"),
    customerPhone: String(params.customerPhone || ""),
    customerAddress: String(params.customerAddress || ""),
    product: String(params.product || "창호"),
    partner: String(params.partner || "직영"),
    scheduleId: String(params.scheduleId || "full"),
    phaseLabel: String(params.phaseLabel || "일시납"),
    amount,
    installmentMonths,
    status: "pending", // 'pending' | 'paid' | 'cancelled'
    paymentUrl: `/pay.html?token=${token}`,
    sentCount: 0,
    lastSentAt: "",
    approvedAt: "",
    approvedAtText: "",
    cancelledAt: "",
    pgProvider: "",
    pgPaymentKey: "",
    pgApprovalNo: "",
    cardCompany: "",
    receiptUrl: "",
    memo: String(params.memo || ""),
    createdAt: nowIso,
    createdAtText: formatShortKst(nowIso),
    updatedAt: nowIso,
  };

  ledger.paymentOrders.unshift(order);

  const meta = ledger.contractMeta[order.contractNo];
  if (meta && Array.isArray(meta.schedules)) {
    const targetSch =
      meta.schedules.find((s) => s.id === order.scheduleId) || meta.schedules[0];
    if (targetSch) {
      targetSch.paymentOrderId = order.orderId;
      targetSch.method = "card";
      if (installmentMonths >= 0) targetSch.installmentMonths = installmentMonths;
    }
    meta.updatedAt = nowIso;
  }

  return order;
}

export async function markOrderPaidAndSyncContract(ledger, order, approvalInfo = {}) {
  const nowIso = new Date().toISOString();
  const todayKst = formatKstDateSlice(nowIso);

  order.status = "paid";
  order.approvedAt = nowIso;
  order.approvedAtText = formatShortKst(nowIso);
  order.pgProvider = approvalInfo.pgProvider || order.pgProvider || "tosspayments";
  order.pgPaymentKey = approvalInfo.pgPaymentKey || order.pgPaymentKey || "";
  order.pgApprovalNo = approvalInfo.pgApprovalNo || order.pgApprovalNo || "";
  order.cardCompany = approvalInfo.cardCompany || order.cardCompany || "카드결제";
  order.receiptUrl = approvalInfo.receiptUrl || order.receiptUrl || "";
  if (approvalInfo.installmentMonths !== undefined) {
    order.installmentMonths = Number(approvalInfo.installmentMonths) || 0;
  }
  order.updatedAt = nowIso;

  const meta = ledger.contractMeta[order.contractNo];
  if (meta && Array.isArray(meta.schedules)) {
    const sch =
      meta.schedules.find(
        (s) => s.paymentOrderId === order.orderId || s.id === order.scheduleId
      ) || meta.schedules[0];
    if (sch) {
      sch.paid = true;
      sch.paidDate = todayKst;
      sch.paidAt = nowIso;
      sch.paymentOrderId = order.orderId;
    }
    meta.updatedAt = nowIso;
  }

  await syncContractTotalsToConvex(order.contractNo, meta, order);
  return order;
}

export async function syncContractTotalsToConvex(contractNo, meta, fallbackOrder = null) {
  if (!contractNo) return null;
  try {
    const data = await convexClient.query(api.crm.listContracts, {});
    const existing = (data.contracts || []).find((c) => c.contractNo === contractNo);
    if (!existing && !meta) return null;

    const totalAmount = Number(
      meta && meta.quoteTotal !== undefined && Number(meta.quoteTotal) > 0
        ? meta.quoteTotal
        : existing?.totalAmount ?? meta?.quoteTotal ?? fallbackOrder?.amount ?? 0
    );
    const paidAmount = meta
      ? computeConfirmedPaidAmount(meta, 0, meta.payCategory === "rental")
      : Number(existing?.depositAmount || 0);
    const balanceAmount =
      meta?.payCategory === "rental"
        ? Math.max(0, Number(meta.rentalTotalFee || totalAmount) - paidAmount)
        : Math.max(0, totalAmount - paidAmount);

    let nextStatus = existing?.status || "계약체결";
    if (meta) {
      const allSchedulesPaid =
        Array.isArray(meta.schedules) &&
        meta.schedules.length > 0 &&
        meta.schedules.every((s) => Boolean(s.paid));
      const anySchedulePaid =
        Array.isArray(meta.schedules) && meta.schedules.some((s) => Boolean(s.paid));

      if (meta.payCategory === "rental") {
        if (allSchedulesPaid) nextStatus = "초기납입완료";
        else if (nextStatus === "초기납입완료") nextStatus = "약정대기";
        else nextStatus = existing?.status || "약정대기";
      } else {
        if (allSchedulesPaid && totalAmount > 0) nextStatus = "수납완료";
        else if (anySchedulePaid) nextStatus = "선금완료";
        else if (["수납완료", "완납", "선금완료"].includes(nextStatus)) nextStatus = "미수납";
      }
    }

    if (existing) {
      await convexClient.mutation(api.crm.upsertContract, {
        contractNo: existing.contractNo,
        projectId: existing.projectId,
        customerName: existing.customerName,
        customerPhone: existing.customerPhone,
        status: nextStatus,
        totalAmount:
          meta?.payCategory === "rental"
            ? Number(meta.rentalTotalFee || totalAmount)
            : totalAmount,
        depositAmount: paidAmount,
        balanceAmount,
        contractDate: existing.contractDate,
        signedAt: paidAmount > 0 ? new Date().toISOString() : existing.signedAt,
      });
    }
    return { totalAmount, paidAmount, balanceAmount, status: nextStatus };
  } catch (err) {
    console.error("[paymentLedger] syncContractTotalsToConvex error:", err);
    return null;
  }
}
