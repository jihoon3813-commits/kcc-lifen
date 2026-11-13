import bcrypt from "bcryptjs";
import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  serializeConvexUser,
  signToken,
} from "../_lib/authHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: "올바르지 않은 JSON 데이터입니다." });

  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username || !password) {
    return res.status(400).json({ error: "아이디와 비밀번호를 입력해 주세요." });
  }

  try {
    const user = await convexClient.query(api.auth.getUserByUsername, { username });
    if (!user || !user.active) {
      return res.status(401).json({ error: "아이디 또는 비밀번호가 일치하지 않거나 비활성화된 계정입니다." });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "아이디 또는 비밀번호가 일치하지 않습니다." });
    }

    const token = signToken(user);
    return res.status(200).json({ token, user: serializeConvexUser(user) });
  } catch (err) {
    console.error("Vercel /api/auth/login error:", err);
    return res.status(500).json({ error: "로그인 처리 중 오류가 발생했습니다." });
  }
}
