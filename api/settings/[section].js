import { api } from "../../convex/_generated/api.js";
import {
  convexClient,
  setCors,
  parseBody,
  authenticateRequest,
  extractSlug,
} from "../_lib/authHelper.js";
import {
  DEFAULT_RENTAL_FORM,
  DEFAULT_RENTAL_PRIVACY_CONTENT,
  PRESERVED_RENTAL_FORM_FIELDS,
  serializeConsentForm,
} from "../_lib/formDefaults.js";
import { fetchUrlAsDataUrl } from "../_lib/storageHelper.js";
import {
  MESSAGING_SETTING_KEY,
  dispatchMessage,
  loadRawMessagingConfig,
  mergeMessagingConfigUpdate,
  normalizeMessagingConfig,
  sanitizeMessagingConfigForClient,
} from "../../server/utils/messagingService.js";

const DEFAULT_STAGES = [
  { id: "1", name: "신규접수", color: "blue", sortOrder: 1, sort_order: 1 },
  { id: "2", name: "상담중", color: "purple", sortOrder: 2, sort_order: 2 },
  { id: "3", name: "가견적요청", color: "orange", sortOrder: 3, sort_order: 3 },
  { id: "4", name: "가견적 생성함", color: "green", sortOrder: 4, sort_order: 4 },
  { id: "5", name: "견적안내", color: "blue", sortOrder: 5, sort_order: 5 },
  { id: "6", name: "실측예정", color: "green", sortOrder: 6, sort_order: 6 },
  { id: "7", name: "최종견적", color: "purple", sortOrder: 7, sort_order: 7 },
  { id: "8", name: "최종견적 생성함", color: "green", sortOrder: 8, sort_order: 8 },
  { id: "9", name: "계약진행", color: "green", sortOrder: 9, sort_order: 9 },
  { id: "10", name: "시공완료", color: "gray", sortOrder: 10, sort_order: 10 },
  { id: "11", name: "보류", color: "gray", sortOrder: 11, sort_order: 11 },
];

const DEFAULT_CONTRACT_STATUSES = [
  { id: "1", name: "계약체결", color: "blue", sortOrder: 1, sort_order: 1 },
  { id: "2", name: "미수납", color: "red", sortOrder: 2, sort_order: 2 },
  { id: "3", name: "약정대기", color: "orange", sortOrder: 3, sort_order: 3 },
  { id: "4", name: "선금완료", color: "blue", sortOrder: 4, sort_order: 4 },
  { id: "5", name: "잔금대기", color: "orange", sortOrder: 5, sort_order: 5 },
  { id: "6", name: "수납완료", color: "green", sortOrder: 6, sort_order: 6 },
  { id: "7", name: "정산완료", color: "green", sortOrder: 7, sort_order: 7 },
  { id: "8", name: "계약보류", color: "gray", sortOrder: 8, sort_order: 8 },
  { id: "9", name: "계약취소", color: "red", sortOrder: 9, sort_order: 9 },
];

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }

  const slug = extractSlug(req, "/api/settings");
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

    // 1b. /api/settings/stages & /:id
    if (section === "stages") {
      const mapStageRow = (s, idx = 0) => ({
        id: s._id || s.id || String(idx + 1),
        name: s.name,
        color: s.color || DEFAULT_STAGES.find((d) => d.name === s.name)?.color || "blue",
        sortOrder: s.sortOrder ?? s.sort_order ?? idx + 1,
        sort_order: s.sortOrder ?? s.sort_order ?? idx + 1,
      });
      if (req.method === "GET") {
        const settings = await convexClient.query(api.settings.listAllSettings, {});
        const list =
          settings.stages && settings.stages.length > 0
            ? settings.stages.map(mapStageRow)
            : DEFAULT_STAGES;
        return res.status(200).json({ stages: list });
      }
      if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
        const body = parseBody(req) || {};
        if (body.direction === "up" || body.direction === "down") {
          await convexClient.mutation(api.settings.upsertStage, {
            idOrName: sub || undefined,
            direction: body.direction,
          });
          const settings = await convexClient.query(api.settings.listAllSettings, {});
          return res.status(200).json({
            stages: (settings.stages || []).map(mapStageRow),
            message: "순서가 변경되었습니다.",
          });
        }
        if (!String(body.name || "").trim()) {
          return res.status(400).json({ error: "진행구분명을 입력해 주세요." });
        }
        const id = await convexClient.mutation(api.settings.upsertStage, {
          idOrName: sub || undefined,
          name: String(body.name).trim(),
          color: body.color ? String(body.color) : "blue",
          sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
        });
        const settings = await convexClient.query(api.settings.listAllSettings, {});
        return res.status(200).json({
          id,
          stages: (settings.stages || []).map(mapStageRow),
          message: "진행구분이 저장되었습니다.",
        });
      }
      if (req.method === "DELETE" && sub) {
        const result = await convexClient.mutation(api.settings.deleteStage, { idOrName: sub });
        if (result?.reason === "min_limit") {
          return res.status(400).json({ error: "최소 1개 이상의 진행구분이 유지되어야 합니다." });
        }
        const settings = await convexClient.query(api.settings.listAllSettings, {});
        return res.status(200).json({
          deleted: true,
          stages: (settings.stages || []).map(mapStageRow),
        });
      }
    }

    // 2. /api/settings/contract-statuses & /:id
    if (section === "contract-statuses") {
      const mapStatusRow = (s, idx = 0) => ({
        id: s._id || s.id || String(idx + 1),
        name: s.name,
        color: s.color || "blue",
        sortOrder: s.sortOrder ?? s.sort_order ?? idx + 1,
        sort_order: s.sortOrder ?? s.sort_order ?? idx + 1,
      });
      if (req.method === "GET") {
        const settings = await convexClient.query(api.settings.listAllSettings, {});
        const list =
          settings.contractStatuses && settings.contractStatuses.length > 0
            ? settings.contractStatuses.map(mapStatusRow)
            : DEFAULT_CONTRACT_STATUSES;
        return res.status(200).json({ contractStatuses: list });
      }
      if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
        const body = parseBody(req) || {};
        if (body.direction === "up" || body.direction === "down") {
          await convexClient.mutation(api.settings.upsertContractStatus, {
            idOrName: sub || undefined,
            direction: body.direction,
          });
          const settings = await convexClient.query(api.settings.listAllSettings, {});
          return res.status(200).json({
            contractStatuses: (settings.contractStatuses || []).map(mapStatusRow),
            message: "순서가 변경되었습니다.",
          });
        }
        if (!String(body.name || "").trim()) {
          return res.status(400).json({ error: "상태명을 입력해 주세요." });
        }
        const id = await convexClient.mutation(api.settings.upsertContractStatus, {
          idOrName: sub || undefined,
          name: String(body.name).trim(),
          color: body.color ? String(body.color) : "blue",
          sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
        });
        const settings = await convexClient.query(api.settings.listAllSettings, {});
        return res.status(200).json({
          id,
          contractStatuses: (settings.contractStatuses || []).map(mapStatusRow),
          message: "계약·수납 상태가 저장되었습니다.",
        });
      }
      if (req.method === "DELETE" && sub) {
        await convexClient.mutation(api.settings.deleteContractStatus, { idOrName: sub });
        const settings = await convexClient.query(api.settings.listAllSettings, {});
        return res.status(200).json({
          deleted: true,
          contractStatuses: (settings.contractStatuses || []).map(mapStatusRow),
        });
      }
    }

    // 3. /api/settings/forms
    if (section === "forms") {
      if (sub === "rental-applicants" && req.method === "GET") {
        const [apps, sigDocs] = await Promise.all([
          convexClient.query(api.rentals.list, {}),
          convexClient.query(api.rentals.listActiveDocuments, { kind: "signature" }).catch(() => []),
        ]);
        const sigByAppNo = new Map((sigDocs || []).map((d) => [d.appNo, d]));

        const applicants = await Promise.all(
          (apps || []).slice(0, 20).map(async (app) => {
            const sigDoc = sigByAppNo.get(app.appNo);
            let signatureDataUrl = null;
            if (sigDoc?.url) {
              if ((sigDoc.byteSize || 0) <= 512 * 1024) {
                try {
                  signatureDataUrl = await fetchUrlAsDataUrl(
                    sigDoc.url,
                    sigDoc.mimeType || "image/png"
                  );
                } catch {}
              }
              if (!signatureDataUrl) {
                signatureDataUrl = sigDoc.url;
              }
            }

            let dateStr = "";
            if (app.createdAt) {
              const d = new Date(app.createdAt);
              if (!Number.isNaN(d.getTime())) {
                const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
                dateStr = `${kst.getUTCFullYear()}년 ${String(kst.getUTCMonth() + 1).padStart(2, "0")}월 ${String(kst.getUTCDate()).padStart(2, "0")}일`;
              }
            }
            if (!dateStr) {
              const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
              dateStr = `${kstNow.getUTCFullYear()}년 ${String(kstNow.getUTCMonth() + 1).padStart(2, "0")}월 ${String(kstNow.getUTCDate()).padStart(2, "0")}일`;
            }

            return {
              id: app.appNo,
              customerName: app.customerName || "고객",
              phone: app.customerPhone || "",
              birthDate: app.customerBirth || "",
              date: dateStr,
              signatureDataUrl,
              planTitle: app.productSummary || `${app.rentalPeriod || 60}개월 렌탈`,
              status: app.status || "received",
            };
          })
        );

        if (applicants.length === 0) {
          const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
          applicants.push({
            id: "SAMPLE-001",
            customerName: "한지우",
            phone: "010-8888-9999",
            birthDate: "1988-06-25",
            date: `${kstNow.getUTCFullYear()}년 ${String(kstNow.getUTCMonth() + 1).padStart(2, "0")}월 ${String(kstNow.getUTCDate()).padStart(2, "0")}일`,
            signatureDataUrl: null,
            planTitle: "60개월 렌탈 (스마트 플랜)",
            status: "received",
          });
        }

        return res.status(200).json({ applicants });
      }

      const loadSerializedForms = async () => {
        const settings = await convexClient.query(api.settings.listAllSettings, {});
        const rawForms = (settings.consentForms || []).filter(
          (f) => f.formId !== "rental_collection"
        );
        if (rawForms.length === 0) {
          await convexClient.mutation(api.settings.upsertConsentForm, {
            formId: DEFAULT_RENTAL_FORM.id,
            name: DEFAULT_RENTAL_FORM.name,
            type: DEFAULT_RENTAL_FORM.type,
            pdfPath: DEFAULT_RENTAL_FORM.pdfPath,
            fileName: DEFAULT_RENTAL_FORM.fileName,
            text: DEFAULT_RENTAL_PRIVACY_CONTENT,
            fieldsConfigJson: JSON.stringify(PRESERVED_RENTAL_FORM_FIELDS),
            enabled: true,
          });
          const refreshed = await convexClient.query(api.settings.listAllSettings, {});
          return (refreshed.consentForms || []).map(serializeConsentForm);
        }
        return rawForms.map(serializeConsentForm);
      };

      const parseStorageIdFromInput = (pdfStorageId, pdfPath) => {
        if (pdfStorageId && typeof pdfStorageId === "string" && pdfStorageId.trim()) {
          return pdfStorageId.trim();
        }
        if (typeof pdfPath === "string" && pdfPath.includes("storageId=")) {
          try {
            const parsed = new URL(pdfPath, "http://localhost");
            const sid = parsed.searchParams.get("storageId");
            if (sid && sid.trim()) return sid.trim();
          } catch {}
        }
        return undefined;
      };

      if (req.method === "GET") {
        const forms = await loadSerializedForms();
        return res.status(200).json({ forms });
      }
      if (req.method === "POST") {
        const body = parseBody(req) || {};
        const formId = String(body.id || body.formId || `form_${Date.now()}`).trim();
        const fieldsConfigJson =
          body.fieldsConfig !== undefined
            ? typeof body.fieldsConfig === "string"
              ? body.fieldsConfig
              : JSON.stringify(body.fieldsConfig)
            : undefined;
        const resolvedStorageId = parseStorageIdFromInput(body.pdfStorageId, body.pdfPath);
        await convexClient.mutation(api.settings.upsertConsentForm, {
          formId,
          name: String(body.name || "동의서 양식").trim(),
          type: String(body.type || "rental"),
          pdfPath: body.pdfPath ? String(body.pdfPath) : undefined,
          pdfStorageId: resolvedStorageId,
          fileName: body.fileName ? String(body.fileName) : undefined,
          text: body.text !== undefined ? String(body.text) : undefined,
          fieldsConfigJson,
          enabled: body.enabled !== false,
        });
        const forms = await loadSerializedForms();
        return res.status(201).json({ id: formId, forms, message: "양식이 저장되었습니다." });
      }
      if (sub && (req.method === "PATCH" || req.method === "PUT")) {
        const body = parseBody(req) || {};
        const settings = await convexClient.query(api.settings.listAllSettings, {});
        const existing = (settings.consentForms || []).find((f) => f.formId === sub);
        const isDefaultRental = sub === "rental_privacy";

        const fieldsConfigJson =
          body.fieldsConfig !== undefined
            ? typeof body.fieldsConfig === "string"
              ? body.fieldsConfig
              : JSON.stringify(body.fieldsConfig)
            : existing?.fieldsConfigJson ??
              (isDefaultRental ? JSON.stringify(PRESERVED_RENTAL_FORM_FIELDS) : undefined);

        const resolvedStorageId = parseStorageIdFromInput(body.pdfStorageId, body.pdfPath);

        const saved = await convexClient.mutation(api.settings.upsertConsentForm, {
          formId: sub,
          name: String(
            body.name || existing?.name || (isDefaultRental ? DEFAULT_RENTAL_FORM.name : sub)
          ).trim(),
          type: body.type ? String(body.type) : existing?.type || "rental",
          pdfPath:
            body.pdfPath !== undefined
              ? String(body.pdfPath || "")
              : existing?.pdfPath ?? (isDefaultRental ? DEFAULT_RENTAL_FORM.pdfPath : undefined),
          pdfStorageId: resolvedStorageId ?? existing?.pdfStorageId,
          fileName:
            body.fileName !== undefined
              ? String(body.fileName || "")
              : existing?.fileName ?? (isDefaultRental ? DEFAULT_RENTAL_FORM.fileName : undefined),
          text:
            body.text !== undefined
              ? String(body.text)
              : existing?.text ?? (isDefaultRental ? DEFAULT_RENTAL_PRIVACY_CONTENT : undefined),
          fieldsConfigJson,
          enabled: body.enabled !== undefined ? Boolean(body.enabled) : existing?.enabled,
        });
        const forms = await loadSerializedForms();
        return res.status(200).json({
          id: sub,
          version: saved?.version || (existing?.version || 1) + 1,
          forms,
          message: "양식이 수정되었습니다.",
        });
      }
      if (sub && req.method === "DELETE") {
        await convexClient.mutation(api.settings.deleteConsentForm, { formId: sub });
        const forms = await loadSerializedForms();
        return res.status(200).json({ deleted: true, forms });
      }
    }

    // 4. /api/settings/integrations & /messaging & /messaging-test
    if (section === "integrations") {
      if (sub === "messaging" && (req.method === "PUT" || req.method === "POST")) {
        const body = parseBody(req) || {};
        const prevRaw = await loadRawMessagingConfig(convexClient, api);
        const merged = mergeMessagingConfigUpdate(prevRaw, body);
        await convexClient.mutation(api.settings.setSetting, {
          key: MESSAGING_SETTING_KEY,
          value: JSON.stringify(merged),
        });
        const effective = normalizeMessagingConfig(merged, process.env);
        const clientCfg = sanitizeMessagingConfigForClient(effective);
        return res.status(200).json({
          success: true,
          saved: true,
          messaging: clientCfg,
          configs: { messaging: clientCfg },
          message: "문자·알림톡 연동 설정이 저장되었습니다.",
        });
      }
      if (sub === "messaging-test" && req.method === "POST") {
        const body = parseBody(req) || {};
        const prevRaw = await loadRawMessagingConfig(convexClient, api);
        const merged = body.config
          ? normalizeMessagingConfig(mergeMessagingConfigUpdate(prevRaw, body.config), process.env)
          : normalizeMessagingConfig(prevRaw, process.env);
        const channel = body.channel === "sms" ? "sms" : "kakao";
        const phone = String(body.phone || "").trim();
        if (phone.replace(/\D/g, "").length < 10) {
          return res.status(400).json({ error: "테스트 수신 휴대폰 번호 10~11자리를 입력해 주세요." });
        }
        const proto = req.headers["x-forwarded-proto"] || "https";
        const host = req.headers["x-forwarded-host"] || req.headers.host || "";
        const quoteUrl = host ? `${proto}://${host}/quote.html` : "/quote.html";
        const result = await dispatchMessage(
          merged,
          {
            channel,
            to: phone,
            recipientName: "테스트고객",
            message:
              String(body.message || "").trim() ||
              `[KCC홈씨씨] 테스트고객 고객님, 문자·알림톡 발송 연동 테스트 메시지입니다.\n▼ 모바일 견적서 확인하기\n${quoteUrl}`,
            quoteUrl,
            projectId: 0,
            quoteId: 0,
            quoteType: "가견적",
            product: "창호",
            totalPrice: 5200000,
            tplKey: body.tplKey || "basic",
            sentBy: auth?.user?.name || "관리자",
          },
          { convexClient, api }
        );
        if (!result.ok) {
          return res.status(result.status || 502).json({
            error: result.error || "테스트 발송에 실패했습니다.",
            provider: result.provider,
          });
        }
        return res.status(200).json({
          success: true,
          simulated: Boolean(result.simulated),
          provider: result.provider,
          message: result.simulated
            ? "실발송 활성화가 꺼져 있어 시뮬레이션 확인만 수행했습니다."
            : result.provider === "phone_bridge"
              ? "폰 브릿지 발송 대기열에 등록했습니다. 연결된 휴대폰 앱에서 곧 발송됩니다."
              : `${channel === "kakao" ? "카카오 알림톡" : "문자(LMS)"} 테스트 발송을 완료했습니다. (${result.provider})`,
        });
      }
      const raw = await loadRawMessagingConfig(convexClient, api);
      const effective = normalizeMessagingConfig(raw, process.env);
      const clientCfg = sanitizeMessagingConfigForClient(effective);
      try {
        clientCfg.bridgeStatus = await convexClient.query(api.smsBridge.getBridgeStatus, {});
      } catch {
        clientCfg.bridgeStatus = null;
      }
      return res.status(200).json({
        messaging: clientCfg,
        configs: { messaging: clientCfg },
      });
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
