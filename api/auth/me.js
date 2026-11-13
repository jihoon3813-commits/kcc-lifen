import bcrypt from "bcryptjs";
import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
  serializeConvexUser,
} from "../_lib/authHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await authenticateRequest(req);
  if (!auth) return res.status(401).json({ error: "로그인이 필요합니다." });

  if (req.method === "GET") {
    return res.status(200).json({ user: auth.user });
  }

  if (req.method === "PATCH") {
    const body = parseBody(req);
    if (!body) return res.status(400).json({ error: "올바르지 않은 JSON 데이터입니다." });

    const { name, phone, email, password, orgName } = body;
    const patch = { userId: auth.user.id };
    if (name !== undefined && String(name).trim()) patch.name = String(name).trim();
    if (phone !== undefined) patch.phone = String(phone).trim();
    if (email !== undefined) patch.email = String(email).trim();
    if (auth.user.role === "partner" && orgName && String(orgName).trim()) {
      patch.orgName = String(orgName).trim();
    }
    if (password && String(password).trim()) {
      patch.passwordHash = bcrypt.hashSync(String(password).trim(), 10);
    }

    try {
      await convexClient.mutation(api.auth.updateUser, patch);
      const updated = await convexClient.query(api.auth.getUserByUsername, {
        username: auth.user.username,
      });
      return res.status(200).json({
        success: true,
        user: serializeConvexUser(updated),
        message: "회원 정보가 성공적으로 수정되었습니다.",
      });
    } catch (err) {
      console.error("Vercel /api/auth/me PATCH error:", err);
      return res.status(500).json({ error: "정보 수정 중 오류가 발생했습니다." });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
