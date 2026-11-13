import bcrypt from "bcryptjs";
import { api } from "../../convex/_generated/api.js";
import {
  normalizeRoleCode,
  getDefaultMenusForRole,
  validateRequestedMenus,
} from "../../server/utils/menuPermissions.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
  serializeConvexUser,
  ALL_MENUS,
} from "../_lib/authHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await authenticateRequest(req);
  if (!auth) return res.status(401).json({ error: "로그인이 필요합니다." });

  if (req.method === "GET") {
    try {
      const users = await convexClient.query(api.auth.listUsers, { includeInactive: false });
      const rows = auth.user.role === "partner" && !auth.user.allowed_menus?.includes("settings")
        ? users.filter((u) => Number(u.orgId) === Number(auth.user.org_id))
        : users;
      return res.status(200).json({
        menus: ALL_MENUS,
        users: rows.map(serializeConvexUser),
      });
    } catch (err) {
      console.error("Vercel /api/auth/users GET error:", err);
      return res.status(500).json({ error: "사용자 목록 조회 중 오류가 발생했습니다." });
    }
  }

  if (req.method === "POST") {
    if (auth.user.role !== "hq_admin" && !auth.user.allowed_menus?.includes("settings")) {
      return res.status(403).json({ error: "해당 메뉴에 대한 접근 권한이 없습니다." });
    }

    const body = parseBody(req);
    if (!body) return res.status(400).json({ error: "올바르지 않은 JSON 데이터입니다." });

    const { username, password, name, phone, email, role, org_id, org, org_name, allowed_menus } = body;
    const cleanUsername = String(username || "").trim();
    const cleanName = String(name || "").trim();
    if (!cleanUsername || !cleanName) {
      return res.status(400).json({ error: "이름과 로그인 아이디를 입력해 주세요." });
    }

    const roleCode = normalizeRoleCode(role);
    let menusToSave = getDefaultMenusForRole(roleCode);
    if (allowed_menus !== undefined) {
      const check = validateRequestedMenus(allowed_menus, cleanUsername);
      if (!check.ok) return res.status(400).json({ error: check.error });
      menusToSave = check.menus;
    }

    const rawPassword = String(password || "").trim() || "user123!";
    const passwordHash = bcrypt.hashSync(rawPassword, 10);

    try {
      const created = await convexClient.mutation(api.auth.createUser, {
        username: cleanUsername,
        passwordHash,
        name: cleanName,
        phone: String(phone || "").trim(),
        email: String(email || "").trim(),
        role: roleCode,
        orgId: org_id ? Number(org_id) : undefined,
        orgName: String(org_name || org || auth.user.org || "라이프앤조이").trim(),
        allowedMenus: JSON.stringify(menusToSave),
      });
      const hydrated = await convexClient.query(api.auth.getUserByUsername, { username: created.username });
      return res.status(201).json({
        id: created.userId,
        user: serializeConvexUser(hydrated),
        message: "사용자가 등록되었습니다.",
      });
    } catch (err) {
      const msg = err?.message || "사용자 등록 중 오류가 발생했습니다.";
      return res.status(400).json({ error: msg });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
