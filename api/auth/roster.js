import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  authenticateRequest,
  serializeConvexUser,
  ALL_MENUS,
} from "../_lib/authHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const auth = await authenticateRequest(req);
  if (!auth) return res.status(401).json({ error: "로그인이 필요합니다." });

  try {
    const users = await convexClient.query(api.auth.listUsers, { includeInactive: false });
    const rows = auth.user.role === "partner"
      ? users.filter((u) => Number(u.userId) === Number(auth.user.id))
      : users;

    return res.status(200).json({
      menus: ALL_MENUS,
      users: rows.map(serializeConvexUser),
    });
  } catch (err) {
    console.error("Vercel /api/auth/roster error:", err);
    return res.status(500).json({ error: "사용자 목록 조회 중 오류가 발생했습니다." });
  }
}
