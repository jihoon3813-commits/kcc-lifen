import bcrypt from "bcryptjs";
import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
} from "../_lib/authHelper.js";

function hasPartnersPermission(user) {
  return user.role === "hq_admin" || (user.allowed_menus || []).includes("partners");
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
      const data = await convexClient.query(api.partners.listPartners, {
        callerRole: auth.user.role,
        callerOrgId: Number(auth.user.org_id || 1),
      });
      return res.status(200).json(data);
    } catch (err) {
      console.error("[Vercel Convex] GET /api/partners error:", err);
      return res.status(500).json({ error: "파트너 목록 조회 중 오류가 발생했습니다." });
    }
  }

  if (req.method === "POST") {
    if (!hasPartnersPermission(auth.user)) {
      return res.status(403).json({ error: "파트너 관리 권한이 없습니다." });
    }

    const body = parseBody(req);
    if (!body) {
      return res.status(400).json({ error: "요청 본문이 올바르지 않습니다." });
    }

    const { name, person, email, phone, parentId, username, password } = body;
    const cleanName = String(name || "").trim();
    if (!cleanName) {
      return res.status(400).json({ error: "파트너사명을 입력해 주세요." });
    }

    const cleanPhone = String(phone || "").trim();
    if (!cleanPhone) {
      return res.status(400).json({ error: "파트너 대표 연락처(전화번호)를 입력해 주세요." });
    }

    const targetUsername = String(username || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");
    if (!targetUsername) {
      return res.status(400).json({
        error: "파트너 어드민 접속 및 전용 랜딩 서브도메인에 사용할 아이디를 입력해 주세요.",
      });
    }

    const cleanPassword = String(password || "").trim();
    if (!cleanPassword || cleanPassword.length < 4) {
      return res.status(400).json({ error: "파트너 어드민 접속 비밀번호를 4자리 이상 입력해 주세요." });
    }

    try {
      const passwordHash = bcrypt.hashSync(cleanPassword, 10);
      const result = await convexClient.mutation(api.partners.createPartner, {
        callerRole: auth.user.role,
        callerOrgId: Number(auth.user.org_id || 1),
        name: cleanName,
        person: String(person || "").trim(),
        email: String(email || "").trim(),
        phone: cleanPhone,
        parentId: parentId && Number(parentId) > 0 ? Number(parentId) : undefined,
        username: targetUsername,
        passwordHash,
      });

      if (!result.ok) {
        return res.status(result.status || 400).json({ error: result.error });
      }
      return res.status(result.status || 201).json(result.data);
    } catch (err) {
      console.error("[Vercel Convex] POST /api/partners error:", err);
      return res.status(500).json({ error: "파트너 등록 중 오류가 발생했습니다." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
