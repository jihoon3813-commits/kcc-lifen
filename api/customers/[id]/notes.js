import { api } from "../../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
} from "../../_lib/authHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }

  const projectId = parseInt(req.query?.id, 10);
  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: "올바르지 않은 JSON 데이터입니다." });

  const { type, note, important } = body;
  if (!note || !String(note).trim()) {
    return res.status(400).json({ error: "내용을 입력해 주세요." });
  }

  try {
    const result = await convexClient.mutation(api.crm.addConsultationNote, {
      projectId,
      authorName: auth.user.name || "관리자",
      type: type === "feedback" ? "feedback" : "notes",
      content: String(note).trim(),
      isImportant: Boolean(important),
    });

    if (!result.found) {
      return res.status(404).json({ error: "고객 공사건을 찾을 수 없습니다." });
    }

    return res.status(201).json({ message: "기록이 Convex 운영 서버에 등록되었습니다." });
  } catch (err) {
    console.error("Vercel POST /api/customers/[id]/notes error:", err);
    return res.status(500).json({ error: "Convex 서버에 상담 이력을 저장하지 못했습니다." });
  }
}
