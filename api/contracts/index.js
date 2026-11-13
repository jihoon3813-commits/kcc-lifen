import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
} from "../_lib/authHelper.js";
import { getRentalStatusLabel, formatKstDateSlice } from "../_lib/crmHelper.js";
import { notifyNewContract } from "../_lib/discordHelper.js";
import {
  loadPaymentLedger,
  savePaymentLedger,
  buildContractPaymentMeta,
  formatPayMethodDisplay,
  computeConfirmedPaidAmount,
  createPaymentOrderInLedger,
} from "../_lib/paymentLedger.js";

function synthesizeFallbackMeta(c, isRental, months, monthly, total, upfront) {
  if (isRental) {
    return {
      contractNo: c.contractNo,
      projectId: Number(c.projectId),
      payCategory: "rental",
      payOption: "rental60",
      installmentMonths: 0,
      quoteTotal: Number(total || c.totalAmount || 0),
      rentalMonths: months || 60,
      rentalMonthly: Number(monthly || 111000),
      rentalUpfront: Number(upfront || 0),
      rentalTotalFee: Number(total || c.totalAmount || 0),
      rentalUpfrontMethod: "cash",
      rentalUpfrontInstallmentMonths: 0,
      schedules:
        Number(upfront || 0) > 0
          ? [
              {
                id: "upfront",
                label: "초기납입금",
                method: "cash",
                installmentMonths: 0,
                amount: Number(upfront || 0),
                paid: false,
                paidDate: "",
                paidAt: "",
                paymentOrderId: "",
              },
            ]
          : [],
    };
  }
  const totalAmt = Number(c.totalAmount || 0);
  const depAmt = Number(c.depositAmount || 0);
  const isFullPaid = totalAmt > 0 && depAmt >= totalAmt;
  if (depAmt > 0 && depAmt < totalAmt) {
    return {
      contractNo: c.contractNo,
      projectId: Number(c.projectId),
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
          paidDate: c.contractDate || (c.createdAt ? c.createdAt.slice(0, 10) : ""),
          paidAt: c.signedAt || c.createdAt || "",
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
    };
  }
  return {
    contractNo: c.contractNo,
    projectId: Number(c.projectId),
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
        paidDate: isFullPaid ? c.contractDate || (c.createdAt ? c.createdAt.slice(0, 10) : "") : "",
        paidAt: isFullPaid ? c.signedAt || c.createdAt || "" : "",
        paymentOrderId: "",
      },
    ],
  };
}

function mapContract(c, projectMap, rentalByAppNo, rentalByProject, ledger) {
  const p = projectMap.get(Number(c.projectId));
  const storedMeta = ledger?.contractMeta?.[c.contractNo] || null;
  const totalAmount = Number(c.totalAmount || storedMeta?.quoteTotal || 0);
  const depositAmount = Number(c.depositAmount || 0);
  const createdAt = c.createdAt || "";
  const date = c.contractDate || (createdAt ? createdAt.slice(0, 10) : "");
  const rApp =
    rentalByAppNo.get(c.contractNo) || rentalByProject.get(Number(c.projectId)) || null;
  const isRental =
    storedMeta?.payCategory === "rental" ||
    String(c.contractNo || "").startsWith("R-") ||
    String(c.status || "").includes("렌탈");

  const months = isRental
    ? Number(storedMeta?.rentalMonths || rApp?.rentalPeriod || 60)
    : undefined;
  const monthly = isRental
    ? Number(storedMeta?.rentalMonthly ?? rApp?.monthlyFee ?? 0)
    : undefined;
  const total = isRental
    ? Number(storedMeta?.rentalTotalFee ?? rApp?.totalRentalFee ?? totalAmount)
    : undefined;
  const upfront = isRental
    ? storedMeta?.rentalUpfront !== undefined
      ? Number(storedMeta.rentalUpfront)
      : rApp
      ? Math.max(
          0,
          Number(rApp.totalRentalFee || 0) -
            Number(rApp.monthlyFee || 0) * Number(rApp.rentalPeriod || 60)
        )
      : 0
    : undefined;

  const effectiveMeta =
    storedMeta || synthesizeFallbackMeta(c, isRental, months, monthly, total, upfront);
  const confirmedPaid = computeConfirmedPaidAmount(effectiveMeta, depositAmount, isRental);
  const effectiveTotal = isRental ? Number(total || totalAmount) : totalAmount;
  const effectiveBalance = Math.max(0, effectiveTotal - confirmedPaid);
  const display = formatPayMethodDisplay(effectiveMeta, isRental ? "렌탈" : "일시불");
  const cardOrders = (ledger?.paymentOrders || []).filter(
    (o) => o.contractNo === c.contractNo
  );

  const typeLabel =
    effectiveMeta.payCategory === "rental"
      ? "렌탈"
      : effectiveMeta.payCategory === "card"
      ? "카드"
      : "현금";

  return {
    id: c.contractNo,
    contract_no: c.contractNo,
    rentalAppId: isRental
      ? rApp?.appNo || (String(c.contractNo || "").startsWith("R-") ? c.contractNo : undefined)
      : undefined,
    rentalStatus: isRental ? getRentalStatusLabel(rApp?.status || "received") : undefined,
    rentalPeriodMonths: months,
    rentalMonthlyFee: monthly,
    rentalTotalFee: total,
    rentalUpfrontFee: upfront,
    rentalUpfrontMethod: effectiveMeta.rentalUpfrontMethod || "cash",
    rentalUpfrontInstallmentMonths: Number(effectiveMeta.rentalUpfrontInstallmentMonths || 0),
    cid: Number(c.projectId),
    project_id: Number(c.projectId),
    customerName: c.customerName || p?.customerName || "",
    customer_name: c.customerName || p?.customerName || "",
    customer_phone: c.customerPhone || p?.customerPhone || "",
    partner: p?.partnerName || "직영",
    product: p?.product || "창호",
    type: typeLabel,
    payCategory: effectiveMeta.payCategory,
    payOption: effectiveMeta.payOption,
    installmentMonths: Number(effectiveMeta.installmentMonths || 0),
    payMethod: display.subText,
    payBadge: display.badgeText,
    schedules: effectiveMeta.schedules || [],
    cardOrders,
    note: effectiveMeta.note || "",
    status: c.status || "계약대기",
    amount: effectiveTotal,
    quoteTotal: Number(effectiveMeta.quoteTotal || totalAmount),
    paid: confirmedPaid,
    balance: effectiveBalance,
    total_amount: effectiveTotal,
    deposit_amount: confirmedPaid,
    balance_amount: effectiveBalance,
    date,
    contract_date: date,
    signed_at: c.signedAt || "",
    createdAt,
    created_at: createdAt,
    createdAtText: createdAt ? createdAt.replace("T", " ").slice(0, 16) : date,
    updatedAt: effectiveMeta.updatedAt || c.updatedAt || "",
  };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }

  if (req.method === "GET") {
    try {
      const [data, rentalApps, ledger] = await Promise.all([
        convexClient.query(api.crm.listContracts, {}),
        convexClient.query(api.rentals.list, {}),
        loadPaymentLedger(),
      ]);
      const projects = data.projects || [];
      const projectMap = new Map(projects.map((p) => [Number(p.projectId), p]));
      const rentalByAppNo = new Map((rentalApps || []).map((a) => [a.appNo, a]));
      const rentalByProject = new Map();
      for (const a of rentalApps || []) {
        if (a.projectId && !rentalByProject.has(Number(a.projectId))) {
          rentalByProject.set(Number(a.projectId), a);
        }
      }
      const isPartner = auth.user.role === "partner" && auth.user.org_name;

      const contracts = (data.contracts || []).map((c) =>
        mapContract(c, projectMap, rentalByAppNo, rentalByProject, ledger)
      );
      const contractNoSet = new Set(contracts.map((c) => c.contract_no));

      for (const a of rentalApps || []) {
        if (!a.projectId || contractNoSet.has(a.appNo)) continue;
        const p = projectMap.get(Number(a.projectId));
        const months = Number(a.rentalPeriod || 60);
        const monthly = Number(a.monthlyFee || 0);
        const total = Number(a.totalRentalFee || monthly * months);
        const upfront = Math.max(0, total - monthly * months);
        const createdAt = a.createdAt || "";
        const date = createdAt ? createdAt.slice(0, 10) : "";
        const storedMeta = ledger?.contractMeta?.[a.appNo] || null;
        const effectiveMeta =
          storedMeta ||
          synthesizeFallbackMeta(
            { contractNo: a.appNo, projectId: a.projectId, totalAmount: total },
            true,
            months,
            monthly,
            total,
            upfront
          );
        const confirmedPaid = computeConfirmedPaidAmount(effectiveMeta, 0, true);
        const display = formatPayMethodDisplay(effectiveMeta, "렌탈");
        const cardOrders = (ledger?.paymentOrders || []).filter(
          (o) => o.contractNo === a.appNo
        );

        contracts.push({
          id: a.appNo,
          contract_no: a.appNo,
          rentalAppId: a.appNo,
          rentalStatus: getRentalStatusLabel(a.status || "received"),
          cid: Number(a.projectId),
          project_id: Number(a.projectId),
          customerName: a.customerName || p?.customerName || "",
          customer_name: a.customerName || p?.customerName || "",
          customer_phone: a.customerPhone || p?.customerPhone || "",
          partner: p?.partnerName || "직영",
          product: p?.product || "창호",
          type: "렌탈",
          payCategory: "rental",
          payOption: "rental60",
          installmentMonths: 0,
          payMethod: display.subText,
          payBadge: display.badgeText,
          schedules: effectiveMeta.schedules || [],
          cardOrders,
          note: effectiveMeta.note || "",
          status: confirmedPaid > 0 ? "초기납입완료" : "렌탈접수",
          amount: total,
          quoteTotal: total,
          paid: confirmedPaid,
          balance: Math.max(0, total - confirmedPaid),
          total_amount: total,
          deposit_amount: confirmedPaid,
          balance_amount: Math.max(0, total - confirmedPaid),
          rentalPeriodMonths: months,
          rentalMonthlyFee: monthly,
          rentalTotalFee: total,
          rentalUpfrontFee: upfront,
          rentalUpfrontMethod: effectiveMeta.rentalUpfrontMethod || "cash",
          rentalUpfrontInstallmentMonths: Number(
            effectiveMeta.rentalUpfrontInstallmentMonths || 0
          ),
          date,
          contract_date: date,
          signed_at: "",
          createdAt,
          created_at: createdAt,
          createdAtText: createdAt ? createdAt.replace("T", " ").slice(0, 16) : date,
          updatedAt: effectiveMeta.updatedAt || a.updatedAt || "",
        });
      }

      const filtered = contracts.filter((c) => !isPartner || c.partner === auth.user.org_name);
      return res.status(200).json({ contracts: filtered });
    } catch (err) {
      console.error("[Vercel Convex] GET /api/contracts error:", err);
      return res.status(500).json({ error: "계약 목록 조회 중 오류가 발생했습니다." });
    }
  }

  if (req.method === "POST") {
    const body = parseBody(req);
    if (!body) {
      return res.status(400).json({ error: "요청 본문이 올바르지 않습니다." });
    }

    const projectId = Number(body.projectId || body.cid || 0);
    if (!projectId) {
      return res.status(400).json({ error: "프로젝트(고객) ID가 필요합니다." });
    }

    try {
      const [bundle, ledger] = await Promise.all([
        convexClient.query(api.crm.getCustomerDetail, { projectId }),
        loadPaymentLedger(),
      ]);
      const proj = bundle?.project;
      const todayKst = formatKstDateSlice(new Date().toISOString());
      const suffix = String(Date.now()).slice(-4);
      const isRentalReq =
        String(body.payCategory || "").toLowerCase() === "rental" ||
        String(body.type || "").includes("렌탈");
      const defaultPrefix = isRentalReq ? "R" : "C";
      const contractNo = String(
        body.contractNo ||
          body.contract_no ||
          `${defaultPrefix}-${todayKst.replace(/-/g, "")}-${projectId}-${suffix}`
      );

      const quoteTotal = Number(body.quoteTotal ?? body.totalAmount ?? body.amount ?? 0);
      const customerName = String(
        body.customerName || body.customer_name || proj?.customerName || ""
      );
      const customerPhone = String(
        body.customerPhone || body.customer_phone || proj?.customerPhone || ""
      );
      const contractDate = String(body.contractDate || body.contract_date || todayKst);

      const meta = buildContractPaymentMeta({
        ...body,
        contractNo,
        projectId,
        quoteTotal,
      });
      if (body.note) meta.note = String(body.note).trim();
      ledger.contractMeta[contractNo] = meta;

      // 카드 결제(또는 렌탈 초기납입금 카드)인 경우 즉시 카드결제 링크 주문 생성
      let createdOrder = null;
      const shouldAutoCreateCard = body.autoCreateCardLink !== false;
      if (shouldAutoCreateCard) {
        if (meta.payCategory === "card") {
          const targetId =
            meta.payOption === "balance"
              ? "balance"
              : meta.payOption === "deposit"
              ? "deposit"
              : "full";
          const targetSch =
            meta.schedules.find((s) => s.id === targetId) || meta.schedules[0];
          if (targetSch && targetSch.amount > 0) {
            createdOrder = createPaymentOrderInLedger(ledger, {
              contractNo,
              projectId,
              customerName,
              customerPhone,
              customerAddress: proj?.customerAddress || "",
              product: proj?.product || "창호",
              partner: proj?.partnerName || "직영",
              scheduleId: targetSch.id,
              phaseLabel: targetSch.label,
              amount: targetSch.amount,
              installmentMonths: targetSch.installmentMonths || meta.installmentMonths || 0,
              memo: meta.note || "",
            });
          }
        } else if (
          meta.payCategory === "rental" &&
          meta.rentalUpfront > 0 &&
          meta.rentalUpfrontMethod === "card"
        ) {
          const upSch = meta.schedules.find((s) => s.id === "upfront");
          if (upSch) {
            createdOrder = createPaymentOrderInLedger(ledger, {
              contractNo,
              projectId,
              customerName,
              customerPhone,
              customerAddress: proj?.customerAddress || "",
              product: proj?.product || "창호",
              partner: proj?.partnerName || "직영",
              scheduleId: "upfront",
              phaseLabel: "렌탈 초기납입금",
              amount: upSch.amount,
              installmentMonths: meta.rentalUpfrontInstallmentMonths || 0,
              memo: meta.note || "",
            });
          }
        }
      }

      await savePaymentLedger(ledger);

      const confirmedPaid = computeConfirmedPaidAmount(
        meta,
        0,
        meta.payCategory === "rental"
      );
      const effectiveTotal =
        meta.payCategory === "rental"
          ? Number(meta.rentalTotalFee || quoteTotal)
          : quoteTotal;
      const balanceAmount = Math.max(0, effectiveTotal - confirmedPaid);

      let contractStatus = String(body.status || "").trim();
      if (!contractStatus) {
        if (meta.payCategory === "rental") {
          contractStatus = confirmedPaid > 0 ? "초기납입완료" : "약정대기";
        } else if (confirmedPaid >= effectiveTotal && effectiveTotal > 0) {
          contractStatus = "수납완료";
        } else if (confirmedPaid > 0) {
          contractStatus = "선금완료";
        } else {
          contractStatus = "미수납";
        }
      }

      await convexClient.mutation(api.crm.upsertContract, {
        contractNo,
        projectId,
        customerName,
        customerPhone,
        status: contractStatus,
        totalAmount: effectiveTotal,
        depositAmount: confirmedPaid,
        balanceAmount,
        contractDate,
        signedAt: confirmedPaid > 0 ? new Date().toISOString() : undefined,
      });

      // 렌탈로 직접 계약 등록한 경우 렌탈 신청 테이블에도 기본 건 연동
      if (meta.payCategory === "rental") {
        await convexClient
          .mutation(api.rentals.upsertApplication, {
            appNo: contractNo,
            projectId,
            customerName,
            customerPhone,
            installationAddress: proj?.customerAddress || "",
            productSummary: `KCC 홈씨씨 ${proj?.product || "창호"} (${meta.rentalMonths}개월 · 월 ${Number(meta.rentalMonthly).toLocaleString("ko-KR")}원)`,
            monthlyFee: Number(meta.rentalMonthly || 111000),
            rentalPeriod: Number(meta.rentalMonths || 60),
            totalRentalFee: effectiveTotal,
            status: "received",
            underwritingMemo: meta.note || "관리자 계약등록을 통한 렌탈 접수",
          })
          .catch(() => {});
      }

      if (proj && !["계약진행", "계약완료", "시공완료"].includes(proj.status || "")) {
        await convexClient.mutation(api.crm.updateProject, {
          projectId,
          status: "계약진행",
          userName: auth.user?.name || "관리자",
        });
      }

      const display = formatPayMethodDisplay(meta);
      await notifyNewContract({
        category: "신규 계약 등록",
        contractNo,
        customerName,
        phone: customerPhone,
        contractType: `${display.badgeText}${display.subText ? ` (${display.subText})` : ""}`,
        status: contractStatus,
        totalAmount: effectiveTotal,
        depositAmount: confirmedPaid,
        balanceAmount,
        product: proj?.product || "창호",
        partnerName: proj?.partnerName || "직영",
        contractDate,
        address: proj?.customerAddress || "",
      });

      return res.status(201).json({
        id: contractNo,
        contractId: contractNo,
        contract_no: contractNo,
        paymentOrder: createdOrder,
        message: "계약이 등록되었습니다.",
      });
    } catch (err) {
      console.error("[Vercel Convex] POST /api/contracts error:", err);
      return res.status(500).json({ error: "계약 등록 중 오류가 발생했습니다." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
