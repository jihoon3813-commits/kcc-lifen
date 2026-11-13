import { api } from "../../../convex/_generated/api.js";
import { convexClient, setCors, authenticateRequest } from "../../_lib/authHelper.js";

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
    const apps = await convexClient.query(api.rentals.list, {
      status: req.query?.status ? String(req.query.status) : undefined,
      search: req.query?.search ? String(req.query.search) : undefined,
    });
    return res.status(200).json({ applications: apps || [] });
  } catch (err) {
    console.error("[Vercel Convex] GET /api/admin/rental-applications error:", err);
    return res.status(500).json({ error: "렌탈 심사 목록 조회 중 오류가 발생했습니다." });
  }
}
