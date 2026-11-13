import { api } from "../../convex/_generated/api.js";
import { convexClient, setCors, authenticateRequest } from "../_lib/authHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }

  if (req.method === "GET") {
    try {
      const apps = await convexClient.query(api.rentals.list, {});
      const applications = (apps || []).map((a) => ({
        id: a.appNo,
        app_no: a.appNo,
        project_id: a.projectId,
        quote_id: a.quoteId,
        customer_name: a.customerName,
        customer_phone: a.customerPhone,
        customer_birth: a.customerBirth || "",
        address: a.installationAddress || "",
        product_summary: a.productSummary || "",
        monthly_fee: a.monthlyFee,
        rental_period: a.rentalPeriod,
        total_rental_fee: a.totalRentalFee,
        status: a.status,
        score: a.score,
        grade: a.grade,
        underwriting_memo: a.underwritingMemo || "",
        created_at: a.createdAt || "",
        updated_at: a.updatedAt || "",
      }));
      return res.status(200).json({ applications });
    } catch (err) {
      console.error("[Vercel Convex] GET /api/rentals error:", err);
      return res.status(500).json({ error: "렌탈 신청 목록 조회 중 오류가 발생했습니다." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
