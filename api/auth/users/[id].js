import bcrypt from "bcryptjs";
import { api } from "../../../convex/_generated/api.js";
import {
  normalizeRoleCode,
  validateRequestedMenus,
} from "../../../server/utils/menuPermissions.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
  serializeConvexUser,
} from "../../_lib/authHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method Not Allowed" });

  const auth = await authenticateRequest(req);
  if (!auth) return res.status(401).json({ error: "로그인이 필요합니다." });
  if (auth.user.role !== "hq_admin" && !auth.user.allowed_menus?.includes("settings")) {
    return res.status(403).json({ error: "해당 메뉴에 대한 접근 권한이 없습니다." });
  }

  const userId = Number(req.query?.id);
  if (!userId) return res.status(400).json({ error: "유효하지 않은 사용자 ID입니다." });

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: "올바르지 않은 JSON 데이터입니다." });

  try {
    const current = await convexClient.query(api.auth.getUserByUserId, { userId });
    if (!current) return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });

    const { name, phone, email, role, org_id, org, org_name, active, password, allowed_menus } = body;
    const patch = { userId };

    if (name !== undefined && String(name).trim()) patch.name = String(name).trim();
    if (phone !== undefined) patch.phone = String(phone).trim();
    if (email !== undefined) patch.email = String(email).trim();
    if (role !== undefined) patch.role = normalizeRoleCode(role);
    if (org_id !== undefined) patch.orgId = Number(org_id);
    if (org_name !== undefined || org !== undefined) {
      patch.orgName = String(org_name || org || "").trim();
    }
    if (active !== undefined) {
      if (current.username === "admin" && !active) {
        return res.status(400).json({ error: "최고관리자(admin) 계정은 비활성화할 수 없습니다." });
      }
      patch.active = Boolean(active);
    }
    if (allowed_menus !== undefined) {
      const check = validateRequestedMenus(allowed_menus, current.username);
      if (!check.ok) return res.status(400).json({ error: check.error });
      patch.allowedMenus = JSON.stringify(check.menus);
    }
    if (password && String(password).trim()) {
      patch.passwordHash = bcrypt.hashSync(String(password).trim(), 10);
    }

    await convexClient.mutation(api.auth.updateUser, patch);
    const updated = await convexClient.query(api.auth.getUserByUsername, { username: current.username });
    return res.status(200).json({
      success: true,
      user: serializeConvexUser(updated),
      message: "사용자 권한 및 표시 메뉴 설정이 저장되었습니다.",
    });
  } catch (err) {
    console.error("Vercel /api/auth/users/[id] PATCH error:", err);
    return res.status(500).json({ error: "사용자 수정 중 오류가 발생했습니다." });
  }
}
