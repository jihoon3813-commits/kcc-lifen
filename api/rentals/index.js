import { api } from "../../convex/_generated/api.js";
import { convexClient, setCors, authenticateRequest } from "../_lib/authHelper.js";
import { maskPhone } from "../../server/utils/mobileQuoteFormatter.js";

const STATUS_LABELS = {
  received: "접수완료",
  reviewing: "심사중",
  supplement: "서류보완",
  approved: "심사승인",
  rejected: "심사반려",
  cancelled: "취소",
};

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }

  try {
    const [apps, crmData] = await Promise.all([
      convexClient.query(api.rentals.list, {}),
      convexClient.query(api.crm.listProjectsBundle, {}),
    ]);

    const projects = crmData?.projects || [];
    const projMap = new Map(projects.map((p) => [Number(p.projectId), p]));
    const isPartner = auth.user.role === "partner" && auth.user.org_name;

    const applications = (apps || [])
      .map((a) => {
        const p = projMap.get(Number(a.projectId));
        const partnerName = p?.partnerName || "직영";
        if (isPartner && partnerName !== auth.user.org_name) return null;

        const months = Number(a.rentalPeriod || 60);
        const monthly = Number(a.monthlyFee || 0);
        const total = Number(a.totalRentalFee || monthly * months);
        const upfront = Math.max(0, total - monthly * months);
        const statusCode = String(a.status || "received");
        const statusLabel = STATUS_LABELS[statusCode] || statusCode;
        const createdAt = a.createdAt || "";
        const date = createdAt ? createdAt.slice(0, 10) : "";
        const createdAtText = createdAt ? createdAt.replace("T", " ").slice(0, 16) : "";

        return {
          id: a.appNo,
          app_no: a.appNo,
          cid: Number(a.projectId || 0),
          project_id: Number(a.projectId || 0),
          name: a.customerName,
          customerName: a.customerName,
          phone: maskPhone(a.customerPhone || ""),
          address: a.installationAddress || p?.customerAddress || "",
          partner: partnerName,
          plan: a.productSummary || `${months}개월 렌탈`,
          planTitle: a.productSummary || `${months}개월 렌탈`,
          months,
          monthly,
          upfront,
          total,
          status: statusLabel,
          statusCode,
          product: p?.product || "창호",
          review: a.underwritingMemo || "",
          consent: true,
          checks: { id: true, signature: true, consent: true },
          date,
          createdAt,
          createdAtText,
        };
      })
      .filter(Boolean);

    return res.status(200).json({ applications });
  } catch (err) {
    console.error("[Vercel Convex] GET /api/rentals error:", err);
    return res.status(500).json({ error: "렌탈 신청 목록 조회 중 오류가 발생했습니다." });
  }
}
