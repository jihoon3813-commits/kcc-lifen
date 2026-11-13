import { setCors } from "../../../_lib/authHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return res.json({
    requires_login: true,
    requires_verification: true,
    mode: "portal",
    title: "KCC홈씨씨 · 나의 창호 견적 조회",
  });
}
