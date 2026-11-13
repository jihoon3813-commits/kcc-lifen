import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
} from "../_lib/authHelper.js";

function mapContract(c, projectMap) {
  const p = projectMap.get(Number(c.projectId));
  return {
    id: c.contractNo,
    contract_no: c.contractNo,
    cid: c.projectId,
    project_id: c.projectId,
    customer_name: c.customerName || p?.customerName || "",
    customer_phone: c.customerPhone || p?.customerPhone || "",
    partner: p?.partnerName || "직영",
    product: p?.product || "창호",
    status: c.status || "계약대기",
    total_amount: Number(c.totalAmount || 0),
    deposit_amount: Number(c.depositAmount || 0),
    balance_amount: Number(c.balanceAmount || 0),
    contract_date: c.contractDate || (c.createdAt ? c.createdAt.slice(0, 10) : ""),
    signed_at: c.signedAt || "",
    created_at: c.createdAt || "",
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
      const data = await convexClient.query(api.crm.listContracts, {});
      const projects = data.projects || [];
      const projectMap = new Map(projects.map((p) => [Number(p.projectId), p]));
      const isPartner = auth.user.role === "partner" && auth.user.org_name;

      const contracts = (data.contracts || [])
        .map((c) => mapContract(c, projectMap))
        .filter((c) => !isPartner || c.partner === auth.user.org_name);

      return res.status(200).json({ contracts });
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
      const bundle = await convexClient.query(api.crm.getProjectDetailBundle, { projectId });
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
