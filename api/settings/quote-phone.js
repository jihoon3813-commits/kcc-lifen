import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
} from "../_lib/authHelper.js";

const SETTING_KEY = "quote_consult_phone";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method === "GET") {
    try {
      const row = await convexClient.query(api.settings.getSetting, {
        key: SETTING_KEY,
      });
      return res.status(200).json({
        phone: row?.value || "",
        updatedAt: row?.updatedAt || null,
      });
    } catch (err) {
      console.error("Vercel quote-phone GET error:", err);
      return res.status(500).json({ error: "전화상담 번호를 불러오지 못했습니다." });
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
    if (rawPhone && !/^[\d\-+\s()]{4,25}$/.test(rawPhone)) {
      return res.status(400).json({ error: "올바른 전화번호 형식을 입력해 주세요. (예: 02-2015-8500, 1588-0000)" });
    }

    try {
      const saved = await convexClient.mutation(api.settings.setSetting, {
        key: SETTING_KEY,
        value: rawPhone,
      });
      return res.status(200).json({
        success: true,
        phone: saved.value,
        updatedAt: saved.updatedAt,
      });
    } catch (err) {
      console.error("Vercel quote-phone PUT error:", err);
      return res.status(500).json({ error: "전화상담 번호 저장에 실패했습니다." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
