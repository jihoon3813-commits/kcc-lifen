import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
  serializeConvexUser,
  signToken,
} from "../_lib/authHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const auth = await authenticateRequest(req);
  if (!auth) return res.status(401).json({ error: "로그인이 필요합니다." });

  const body = parseBody(req) || {};
  const { userId, username, roleName } = body;

  if (auth.user.role !== "hq_admin") {
    const isSelf =
      (userId && Number(userId) === auth.user.id) ||
      (username && String(username).trim() === auth.user.username);
    if (!isSelf) {
      return res.status(403).json({ error: "본사 최고관리자만 계정을 전환할 수 있습니다." });
    }
  }

  try {
    let target = null;
    if (userId) {
      target = await convexClient.query(api.auth.getUserByUserId, { userId: Number(userId) });
    }
    if (!target && username) {
      target = await convexClient.query(api.auth.getUserByUsername, { username: String(username).trim() });
    }
    if (!target && roleName) {
      const roleMap = {
        "본사 관리자": "admin",
        "최고관리자": "admin",
        "상담사": "youngjin",
        "견적 담당자": "jeongyeon",
        "파트너 관리자": "partner_hanbit",
        "한빛인테리어": "partner_hanbit",
        "리움디자인": "partner_rium",
        "회계 담당자": "jihee",
        "회계·정산": "jihee",
      };
      const mapped = roleMap[roleName] || String(roleName).trim();
      target = await convexClient.query(api.auth.getUserByUsername, { username: mapped });
    }

    if (!target || !target.active) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    const token = signToken(target);
    return res.status(200).json({ token, user: serializeConvexUser(target) });
  } catch (err) {
    console.error("Vercel /api/auth/switch-role error:", err);
    return res.status(500).json({ error: "계정 전환 중 오류가 발생했습니다." });
  }
}
