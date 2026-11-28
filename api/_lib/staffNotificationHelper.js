import { api } from "../../convex/_generated/api.js";
import { convexClient } from "./authHelper.js";
import { parseNotifyPrefs } from "./notifyPrefsHelper.js";
import {
  resolveMessagingConfig,
  dispatchMessage,
} from "../../server/utils/messagingService.js";

function formatWon(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return `${Math.round(num).toLocaleString("ko-KR")}원`;
}

function cleanText(val, fallback = "-") {
  const s = String(val ?? "").trim();
  return s || fallback;
}

export function buildStaffNotificationMessage(eventType, data = {}) {
  if (eventType === "newCustomer") {
    const partner = cleanText(data.partner, "직영");
    const channel = cleanText(data.channel, "직접등록");
    const lines = [
      `[KCC홈씨씨] ${cleanText(data.category, "신규 고객 접수 안내")}`,
      `■ 고객명: ${cleanText(data.customerName)}`,
      `■ 연락처: ${cleanText(data.phone)}`,
      `■ 관심상품: ${cleanText(data.product, "창호")}`,
      `■ 주소: ${cleanText(data.address)}`,
      `■ 유입경로: ${channel} (${partner})`,
    ];
    if (data.receiptId) lines.push(`■ 접수번호: #${data.receiptId}`);
    if (data.owner && data.owner !== "미배정") lines.push(`■ 담당자: ${data.owner}`);
    return lines.join("\n");
  }

  if (eventType === "newQuote") {
    const phonePart = data.phone ? ` (${data.phone})` : "";
    const customerLabel =
      cleanText(data.customerName, data.projectId ? `고객 #${data.projectId}` : "-");
    const quoteType = cleanText(data.quoteType, "가견적");
    const version = data.version || 1;
    const partner = cleanText(data.partnerName, "직영");
    const author = cleanText(data.userName, "관리자");
    return [
      "[KCC홈씨씨] 신규 견적 생성 안내",
      `■ 고객명: ${customerLabel}${phonePart}`,
      `■ 구분: ${quoteType} (v${version})`,
      `■ 견적금액: ${formatWon(data.totalPrice)}`,
      `■ 견적명: ${cleanText(data.title)}`,
      `■ 작성자: ${author} (${partner})`,
    ].join("\n");
  }

  return "";
}

/**
 * Send SMS / KakaoTalk notifications to non-partner users who opted in.
 * Never throws into caller flows.
 */
export async function notifyStaffByMessaging(eventType, data = {}) {
  if (eventType !== "newCustomer" && eventType !== "newQuote") return { sent: 0 };

  try {
    const users = await convexClient.query(api.auth.listUsers, { includeInactive: false });
    const targets = [];

    for (const u of users || []) {
      if (!u || u.active === false) continue;
      if (u.role === "partner") continue; // 파트너 제외, 사용자관리 내 본사/관리자 계정만 수신
      const digits = String(u.phone || "").replace(/\D/g, "");
      if (digits.length < 10) continue;

      const prefs = parseNotifyPrefs(u.notifyPrefs, u.role);
      const eventPrefs = prefs[eventType] || { sms: false, kakao: false };
      if (!eventPrefs.sms && !eventPrefs.kakao) continue;

      targets.push({
        name: u.name || u.username || "담당자",
        phone: u.phone,
        sms: Boolean(eventPrefs.sms),
        kakao: Boolean(eventPrefs.kakao),
      });
    }

    if (!targets.length) return { sent: 0 };

    const cfg = await resolveMessagingConfig(convexClient, api);
    const message = buildStaffNotificationMessage(eventType, data);
    if (!message) return { sent: 0 };

    const tasks = [];
    for (const target of targets) {
      if (target.sms) {
        tasks.push(
          dispatchMessage(
            cfg,
            {
              channel: "sms",
              to: target.phone,
              recipientName: target.name,
              message,
              projectId: data.projectId || data.receiptId || 0,
              quoteType: data.quoteType || (eventType === "newCustomer" ? "신규고객" : "견적생성"),
              product: data.product || "창호",
              totalPrice: data.totalPrice || 0,
              sentBy: "시스템자동알림",
            },
            { convexClient, api }
          )
        );
      }
      if (target.kakao) {
        tasks.push(
          dispatchMessage(
            cfg,
            {
              channel: "kakao",
              to: target.phone,
              recipientName: target.name,
              message,
              projectId: data.projectId || data.receiptId || 0,
              quoteType: data.quoteType || (eventType === "newCustomer" ? "신규고객" : "견적생성"),
              product: data.product || "창호",
              totalPrice: data.totalPrice || 0,
              sentBy: "시스템자동알림",
            },
            { convexClient, api }
          )
        );
      }
    }

    const results = await Promise.allSettled(tasks);
    let sent = 0;
    for (const r of results) {
      if (r.status === "fulfilled" && r.value?.ok) {
        sent += 1;
      } else if (r.status === "fulfilled" && !r.value?.ok) {
        console.warn("[Staff Messaging] Dispatch skipped/failed:", r.value?.error || r.value?.detail);
      } else if (r.status === "rejected") {
        console.warn("[Staff Messaging] Dispatch error:", r.reason?.message || r.reason);
      }
    }
    return { sent, attempted: tasks.length };
  } catch (err) {
    console.warn("[Staff Messaging] Unexpected error:", err?.message || err);
    return { sent: 0 };
  }
}
