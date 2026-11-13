import { api } from "../../convex/_generated/api.js";
import { convexClient, setCors, authenticateRequest } from "../_lib/authHelper.js";
import { getRentalStatusLabel, normalizeRentalStatusCode } from "../_lib/crmHelper.js";
import { maskPhone } from "../../server/utils/mobileQuoteFormatter.js";

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
    const [apps, projectsList, activeDocs] = await Promise.all([
      convexClient.query(api.rentals.list, {}),
      convexClient.query(api.projects.list, {}),
      convexClient.query(api.rentals.listActiveDocuments, {}).catch(() => []),
    ]);

    const docMap = new Map();
    for (const d of activeDocs || []) {
      const entry = docMap.get(d.appNo) || { hasIdCard: false, hasSignature: false };
      if (d.kind === "id_card") entry.hasIdCard = true;
      if (d.kind === "signature") entry.hasSignature = true;
      docMap.set(d.appNo, entry);
    }

    const projects = Array.isArray(projectsList) ? projectsList : [];
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
        const statusCode = normalizeRentalStatusCode(a.status);
        const statusLabel = getRentalStatusLabel(statusCode);
        const createdAt = a.createdAt || "";
        const date = createdAt ? createdAt.slice(0, 10) : "";
        const createdAtText = createdAt ? createdAt.replace("T", " ").slice(0, 16) : "";
        const docFlags = docMap.get(a.appNo) || { hasIdCard: false, hasSignature: false };

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
          hasIdCard: docFlags.hasIdCard,
          hasSignature: docFlags.hasSignature,
          checks: {
            id: Boolean(a.checkId),
            signature: Boolean(a.checkSignature),
            consent: Boolean(a.checkConsent),
          },
          date,
          createdAt,
          createdAtText,
          updatedAt: a.updatedAt || "",
        };
      })
      .filter(Boolean);

    return res.status(200).json({ applications });
  } catch (err) {
    console.error("[Vercel Convex] GET /api/rentals error:", err);
    return res.status(500).json({ error: "렌탈 신청 목록 조회 중 오류가 발생했습니다." });
  }
}
