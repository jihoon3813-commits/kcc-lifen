import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
} from "../_lib/authHelper.js";
import { getRentalStatusLabel } from "../_lib/crmHelper.js";

function mapContract(c, projectMap, rentalByAppNo, rentalByProject) {
  const p = projectMap.get(Number(c.projectId));
  const totalAmount = Number(c.totalAmount || 0);
  const depositAmount = Number(c.depositAmount || 0);
  const balanceAmount = Number(c.balanceAmount || 0);
  const createdAt = c.createdAt || "";
  const date = c.contractDate || (createdAt ? createdAt.slice(0, 10) : "");
  const rApp = rentalByAppNo.get(c.contractNo) || rentalByProject.get(Number(c.projectId)) || null;
  const isRental =
    String(c.contractNo || "").startsWith("R-") ||
    String(c.status || "").includes("렌탈");

  const months = isRental ? Number(rApp?.rentalPeriod || 60) : undefined;
  const monthly = isRental && rApp ? Number(rApp.monthlyFee || 0) : undefined;
  const total = isRental && rApp ? Number(rApp.totalRentalFee || totalAmount) : undefined;
  const upfront = isRental && rApp ? Math.max(0, Number(rApp.totalRentalFee || 0) - Number(rApp.monthlyFee || 0) * Number(rApp.rentalPeriod || 60)) : undefined;

  return {
    id: c.contractNo,
    contract_no: c.contractNo,
    rentalAppId: isRental ? (rApp?.appNo || (String(c.contractNo || "").startsWith("R-") ? c.contractNo : undefined)) : undefined,
    rentalStatus: isRental ? getRentalStatusLabel(rApp?.status || "received") : undefined,
    rentalPeriodMonths: months,
    rentalMonthlyFee: monthly,
    rentalTotalFee: total,
    rentalUpfrontFee: upfront,
    cid: Number(c.projectId),
    project_id: Number(c.projectId),
    customerName: c.customerName || p?.customerName || "",
    customer_name: c.customerName || p?.customerName || "",
    customer_phone: c.customerPhone || p?.customerPhone || "",
    partner: p?.partnerName || "직영",
    product: p?.product || "창호",
    type: isRental ? "렌탈" : "일시불",
    status: c.status || "계약대기",
    amount: totalAmount,
    paid: depositAmount,
    balance: balanceAmount,
    total_amount: totalAmount,
    deposit_amount: depositAmount,
    balance_amount: balanceAmount,
    date,
    contract_date: date,
    signed_at: c.signedAt || "",
    createdAt,
    created_at: createdAt,
    createdAtText: createdAt ? createdAt.replace("T", " ").slice(0, 16) : date,
    updatedAt: c.updatedAt || "",
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
      const [data, rentalApps] = await Promise.all([
        convexClient.query(api.crm.listContracts, {}),
        convexClient.query(api.rentals.list, {}),
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
        mapContract(c, projectMap, rentalByAppNo, rentalByProject)
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
          status: "렌탈접수",
          amount: total,
          paid: upfront,
          balance: Math.max(0, total - upfront),
          total_amount: total,
          deposit_amount: upfront,
          balance_amount: Math.max(0, total - upfront),
          rentalPeriodMonths: months,
          rentalMonthlyFee: monthly,
          rentalTotalFee: total,
          rentalUpfrontFee: upfront,
          date,
          contract_date: date,
          signed_at: "",
          createdAt,
          created_at: createdAt,
          createdAtText: createdAt ? createdAt.replace("T", " ").slice(0, 16) : date,
          updatedAt: a.updatedAt || "",
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
      const bundle = await convexClient.query(api.crm.getCustomerDetail, { projectId });
      const proj = bundle?.project;
      const contractNo = String(
        body.contractNo || body.contract_no || `C-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${projectId}`
      );
      const totalAmount = Number(body.totalAmount ?? body.total_amount ?? 0);
      const depositAmount = Number(body.depositAmount ?? body.deposit_amount ?? 0);
      const balanceAmount = Number(
        body.balanceAmount ?? body.balance_amount ?? Math.max(0, totalAmount - depositAmount)
      );

      await convexClient.mutation(api.crm.upsertContract, {
        contractNo,
        projectId,
        customerName: String(body.customerName || body.customer_name || proj?.customerName || ""),
        customerPhone: String(body.customerPhone || body.customer_phone || proj?.customerPhone || ""),
        status: String(body.status || "계약진행"),
        totalAmount,
        depositAmount,
        balanceAmount,
        contractDate: String(body.contractDate || body.contract_date || new Date().toISOString().slice(0, 10)),
        signedAt: body.signedAt ? String(body.signedAt) : undefined,
      });

      return res.status(201).json({
        id: contractNo,
        contract_no: contractNo,
        message: "계약이 등록되었습니다.",
      });
    } catch (err) {
      console.error("[Vercel Convex] POST /api/contracts error:", err);
      return res.status(500).json({ error: "계약 등록 중 오류가 발생했습니다." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
