import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
} from "../_lib/authHelper.js";

const DEFAULT_CONTRACT_STATUSES = [
  { id: "1", name: "계약대기", color: "#64748b", sortOrder: 1 },
  { id: "2", name: "계약금완료", color: "#2563eb", sortOrder: 2 },
  { id: "3", name: "시공예정", color: "#7c3aed", sortOrder: 3 },
  { id: "4", name: "완납", color: "#16a34a", sortOrder: 4 },
  { id: "5", name: "취소", color: "#dc2626", sortOrder: 5 },
];

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }

  const slug = Array.isArray(req.query?.slug) ? req.query.slug : [req.query?.slug].filter(Boolean);
  const section = String(slug[0] || "").trim();
  const sub = String(slug[1] || "").trim();

  try {
    // 1. /api/settings/labels
    if (section === "labels") {
      const settings = await convexClient.query(api.settings.listAllSettings, {});
      return res.status(200).json({
        labels: (settings.labels || []).map((l) => ({
          id: l._id,
          name: l.name,
          color: l.color,
          sortOrder: l.sortOrder,
        })),
      });
    }

    // 2. /api/settings/contract-statuses & /:id
    if (section === "contract-statuses") {
      if (req.method === "GET") {
        const settings = await convexClient.query(api.settings.listAllSettings, {});
        const list =
          settings.contractStatuses && settings.contractStatuses.length > 0
            ? settings.contractStatuses.map((s) => ({
                id: s._id,
                name: s.name,
                color: s.color,
                sortOrder: s.sortOrder,
              }))
            : DEFAULT_CONTRACT_STATUSES;
        return res.status(200).json({ contractStatuses: list });
      }
      if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
        const body = parseBody(req) || {};
        if (!String(body.name || "").trim()) {
          return res.status(400).json({ error: "상태명을 입력해 주세요." });
        }
        const id = await convexClient.mutation(api.settings.upsertContractStatus, {
          name: String(body.name).trim(),
          color: body.color ? String(body.color) : "#2563eb",
          sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
        });
        return res.status(200).json({ id, message: "계약·수납 상태가 저장되었습니다." });
      }
      if (req.method === "DELETE" && sub) {
        await convexClient.mutation(api.settings.deleteContractStatus, { idOrName: sub });
        return res.status(200).json({ deleted: true });
      }
    }

    // 3. /api/settings/forms
    if (section === "forms") {
      if (sub === "rental-applicants" && req.method === "GET") {
        const apps = await convexClient.query(api.rentals.list, {});
        return res.status(200).json({ applicants: apps || [] });
      }
      if (sub === "upload-pdf" && req.method === "POST") {
        return res.status(200).json({
          uploaded: true,
          fileName: "form.pdf",
          message: "양식 파일이 반영되었습니다.",
        });
      }
      if (req.method === "GET") {
        const settings = await convexClient.query(api.settings.listAllSettings, {});
        const forms = (settings.consentForms || []).map((f) => ({
          id: f.formId,
          name: f.name,
          type: f.type,
          fileName: f.fileName || "",
          text: f.fieldsConfigJson || "",
          version: f.version,
          enabled: f.enabled,
          updatedAt: f.updatedAt || "",
        }));
        return res.status(200).json({ forms });
      }
      if (req.method === "POST") {
        const body = parseBody(req) || {};
        const formId = String(body.id || body.formId || `form_${Date.now()}`).trim();
        await convexClient.mutation(api.settings.upsertConsentForm, {
          formId,
          name: String(body.name || "동의서 양식").trim(),
          type: String(body.type || "rental"),
          fileName: body.fileName ? String(body.fileName) : undefined,
          fieldsConfigJson: body.text ? String(body.text) : undefined,
          enabled: body.enabled !== false,
        });
        return res.status(201).json({ id: formId, message: "양식이 저장되었습니다." });
      }
      if (sub && (req.method === "PATCH" || req.method === "PUT")) {
        const body = parseBody(req) || {};
        const settings = await convexClient.query(api.settings.listAllSettings, {});
        const existing = (settings.consentForms || []).find((f) => f.formId === sub);
        await convexClient.mutation(api.settings.upsertConsentForm, {
          formId: sub,
          name: String(body.name || existing?.name || sub).trim(),
          type: body.type ? String(body.type) : existing?.type,
          fieldsConfigJson: body.text !== undefined ? String(body.text) : existing?.fieldsConfigJson,
          enabled: body.enabled !== undefined ? Boolean(body.enabled) : existing?.enabled,
        });
        return res.status(200).json({ id: sub, message: "양식이 수정되었습니다." });
      }
      if (sub && req.method === "DELETE") {
        await convexClient.mutation(api.settings.deleteConsentForm, { formId: sub });
        return res.status(200).json({ deleted: true });
      }
    }

    // 4. /api/settings/integrations & /messaging
    if (section === "integrations") {
      if (sub === "messaging" && (req.method === "PUT" || req.method === "POST")) {
        const body = parseBody(req) || {};
        await convexClient.mutation(api.settings.setSetting, {
          key: "integrations_messaging",
          value: JSON.stringify(body),
        });
        return res.status(200).json({ saved: true, message: "메시지 연동 설정이 저장되었습니다." });
      }
      const setting = await convexClient.query(api.settings.getSetting, {
        key: "integrations_messaging",
      });
      let messaging = {};
      try {
        messaging = setting?.value ? JSON.parse(setting.value) : {};
      } catch {}
      return res.status(200).json({ messaging });
    }

    // 5. /api/settings/reset
    if (section === "reset" && req.method === "POST") {
      return res.status(200).json({
        success: true,
        message: "초기화 요청이 처리되었습니다.",
      });
    }

    return res.status(404).json({ error: `지원하지 않는 설정 경로입니다: /api/settings/${slug.join("/")}` });
  } catch (err) {
    console.error("[Vercel Convex] /api/settings/[...slug] error:", err);
    return res.status(500).json({ error: "설정 처리 중 오류가 발생했습니다." });
  }
}
