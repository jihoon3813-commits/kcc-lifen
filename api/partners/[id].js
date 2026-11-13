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

  if (!hasPartnersPermission(auth.user)) {
    return res.status(403).json({ error: "파트너 관리 권한이 없습니다." });
  }

  const rawId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  const idOrCode = String(rawId || "").trim();
  if (!idOrCode) {
    return res.status(400).json({ error: "파트너 ID가 필요합니다." });
  }

  if (req.method === "PUT") {
    const body = parseBody(req);
    if (!body) {
      return res.status(400).json({ error: "요청 본문이 올바르지 않습니다." });
    }

    const { name, person, email, phone, parentId, username, password } = body;
    const cleanPw = String(password || "").trim();
    if (cleanPw && cleanPw.length < 4) {
      return res.status(400).json({ error: "비밀번호를 4자리 이상 입력해 주세요." });
    }

    try {
      const passwordHash = cleanPw ? bcrypt.hashSync(cleanPw, 10) : undefined;
      const fallbackPasswordHash = bcrypt.hashSync("partner123!", 10);

      let parsedParentId;
      if (parentId !== undefined) {
        parsedParentId = parentId && Number(parentId) > 0 ? Number(parentId) : null;
      }

      const result = await convexClient.mutation(api.partners.updatePartner, {
        callerRole: auth.user.role,
        callerOrgId: Number(auth.user.org_id || 1),
        idOrCode,
        name: name !== undefined ? String(name) : undefined,
        person: person !== undefined ? String(person) : undefined,
        email: email !== undefined ? String(email) : undefined,
        phone: phone !== undefined ? String(phone) : undefined,
        parentId: parsedParentId,
        username: username !== undefined ? String(username) : undefined,
        passwordHash,
        fallbackPasswordHash,
      });

      if (!result.ok) {
        return res.status(result.status || 400).json({ error: result.error });
      }
      return res.status(result.status || 200).json(result.data);
    } catch (err) {
      console.error("[Vercel Convex] PUT /api/partners/[id] error:", err);
      return res.status(500).json({ error: "파트너 수정 중 오류가 발생했습니다." });
    }
  }

  if (req.method === "DELETE") {
    try {
      const result = await convexClient.mutation(api.partners.deletePartner, {
        callerRole: auth.user.role,
        callerOrgId: Number(auth.user.org_id || 1),
        idOrCode,
      });

      if (!result.ok) {
        return res.status(result.status || 400).json({ error: result.error });
      }
      return res.status(result.status || 200).json(result.data);
    } catch (err) {
      console.error("[Vercel Convex] DELETE /api/partners/[id] error:", err);
      return res.status(500).json({ error: "파트너 삭제 중 오류가 발생했습니다." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
