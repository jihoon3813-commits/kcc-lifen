import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
} from "../_lib/authHelper.js";

const PHONE_KEY = "quote_consult_phone";
const MANAGER_KEY = "quote_consult_manager_name";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method === "GET") {
    try {
      const [phoneRow, managerRow] = await Promise.all([
        convexClient.query(api.settings.getSetting, { key: PHONE_KEY }),
        convexClient.query(api.settings.getSetting, { key: MANAGER_KEY }),
      ]);
      return res.status(200).json({
        phone: phoneRow?.value || "",
        managerName: managerRow?.value || "",
        updatedAt: phoneRow?.updatedAt || managerRow?.updatedAt || null,
      });
    } catch (err) {
      console.error("Vercel quote-phone GET error:", err);
      return res.status(500).json({ error: "견적 상담 설정을 불러오지 못했습니다." });
    }
  }

  if (req.method === "PUT" || req.method === "POST") {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
    }
    const allowedMenus = auth.user?.allowed_menus || [];
    if (auth.user?.role !== "hq_admin" && !allowedMenus.includes("settings")) {
      return res.status(403).json({ error: "설정 변경 권한이 없습니다." });
    }

    const body = parseBody(req);
    if (!body) {
      return res.status(400).json({ error: "잘못된 요청 형식입니다." });
    }

    const rawPhone = String(body.phone ?? "").trim();
    const rawManager = String(body.managerName ?? "").trim().slice(0, 40);
    if (rawPhone && !/^[\d\-+\s()]{4,25}$/.test(rawPhone)) {
      return res.status(400).json({ error: "올바른 전화번호 형식을 입력해 주세요. (예: 02-2015-8500, 1588-0000)" });
    }

    try {
      const [savedPhone, savedManager] = await Promise.all([
        convexClient.mutation(api.settings.setSetting, {
          key: PHONE_KEY,
          value: rawPhone,
        }),
        convexClient.mutation(api.settings.setSetting, {
          key: MANAGER_KEY,
          value: rawManager,
        }),
      ]);
      return res.status(200).json({
        success: true,
        phone: savedPhone.value,
        managerName: savedManager.value,
        updatedAt: savedPhone.updatedAt || savedManager.updatedAt,
      });
    } catch (err) {
      console.error("Vercel quote-phone PUT error:", err);
      return res.status(500).json({ error: "견적 상담 설정 저장에 실패했습니다." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
