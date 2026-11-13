export const DISCORD_WEBHOOK_URL =
  process.env.DISCORD_WEBHOOK_URL ||
  "https://discordapp.com/api/webhooks/1570707391845240925/iOsaiN4YEZLrVRIlNNN1k1fZvIKTmm3j9IGdQnKGSXVTnRV4K999UeSKbWXYYK0YEV6R";

function formatKstNow() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${kst.toISOString().replace("T", " ").slice(0, 19)} KST`;
}

function formatWon(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return `${Math.round(num).toLocaleString("ko-KR")}원`;
}

function cleanFieldValue(val, maxLen = 250) {
  const str = String(val ?? "").trim();
  if (!str) return "-";
  return str.length > maxLen ? `${str.slice(0, maxLen - 3)}...` : str;
}

function buildEmbed({ title, description, color, fields }) {
  return {
    embeds: [
      {
        title: cleanFieldValue(title, 200),
        description: description ? cleanFieldValue(description, 500) : undefined,
        color,
        fields: fields
          .filter((f) => f && f.name && f.value !== undefined && f.value !== null && String(f.value).trim() !== "")
          .slice(0, 25)
          .map((f) => ({
            name: String(f.name).slice(0, 100),
            value: cleanFieldValue(f.value, 500),
            inline: f.inline !== false,
          })),
        footer: {
          text: `KCC홈씨씨 CRM · ${formatKstNow()}`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Send a payload to the configured Discord webhook without ever throwing into caller flows.
 */
export async function sendDiscordWebhook(payload) {
  if (!DISCORD_WEBHOOK_URL) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const resp = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      console.warn(`[Discord Webhook] Failed (${resp.status}):`, errText.slice(0, 200));
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Discord Webhook] Send error:", err?.message || err);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function notifyNewCustomer({
  category = "신규 고객 등록",
  receiptId,
  customerName,
  phone,
  address,
  product,
  channel,
  partner,
  owner,
  note,
}) {
  return sendDiscordWebhook(
    buildEmbed({
      title: `👤 [고객관리] ${category}`,
      color: 0x2563eb,
      fields: [
        { name: "고객명", value: customerName },
        { name: "연락처", value: phone },
        { name: "고객 ID / 접수번호", value: receiptId ? `#${receiptId}` : "-" },
        { name: "관심 상품", value: product || "창호" },
        { name: "유입 경로(채널)", value: channel || "직접등록" },
        { name: "소속 / 파트너", value: partner || "직영" },
        ...(owner ? [{ name: "담당자", value: owner }] : []),
        { name: "설치 지역 / 주소", value: address || "-", inline: false },
        ...(note ? [{ name: "메모", value: note, inline: false }] : []),
      ],
    })
  );
}

export async function notifyNewQuote({
  projectId,
  customerName,
  phone,
  version,
  title,
  quoteType,
  status,
  totalPrice,
  partnerName,
  userName,
}) {
  const isPublished = status === "published";
  return sendDiscordWebhook(
    buildEmbed({
      title: `📄 [견적관리] 신규 ${quoteType || "견적"} ${isPublished ? "발행" : "등록"}`,
      color: 0x059669,
      fields: [
        { name: "고객명", value: customerName || (projectId ? `고객 #${projectId}` : "-") },
        ...(phone ? [{ name: "연락처", value: phone }] : []),
        { name: "견적 구분 / 버전", value: `${quoteType || "가견적"} (v${version || 1})` },
        { name: "최종 견적금액", value: formatWon(totalPrice) },
        { name: "견적서명", value: title || "-", inline: false },
        { name: "소속 / 파트너", value: partnerName || "직영" },
        { name: "작성자", value: userName || "관리자" },
      ],
    })
  );
}

export async function notifyNewQuoteInquiry({
  projectId,
  customerName,
  phone,
  product,
  topics,
  preferredTime,
  planSummary,
  memo,
}) {
  return sendDiscordWebhook(
    buildEmbed({
      title: "💬 [견적관리] 고객 견적 문의 접수",
      color: 0x0d9488,
      fields: [
        { name: "고객명", value: customerName || (projectId ? `고객 #${projectId}` : "-") },
        ...(phone ? [{ name: "연락처", value: phone }] : []),
        { name: "상품", value: product || "창호" },
        { name: "희망 연락시간", value: preferredTime || "상관없음" },
        { name: "문의 항목", value: Array.isArray(topics) && topics.length ? topics.join(", ") : "견적 전반 상담", inline: false },
        ...(planSummary ? [{ name: "선택 조건", value: planSummary, inline: false }] : []),
        ...(memo ? [{ name: "고객 메모", value: memo, inline: false }] : []),
      ],
    })
  );
}

export async function notifyNewContract({
  category = "신규 계약 등록",
  contractNo,
  customerName,
  phone,
  contractType,
  status,
  totalAmount,
  depositAmount,
  balanceAmount,
  product,
  partnerName,
  contractDate,
  summary,
  address,
}) {
  return sendDiscordWebhook(
    buildEmbed({
      title: `📝 [계약관리] ${category}`,
      color: 0x7c3aed,
      fields: [
        { name: "계약 / 접수번호", value: contractNo || "-" },
        { name: "고객명", value: customerName || "-" },
        ...(phone ? [{ name: "연락처", value: phone }] : []),
        { name: "계약 구분 / 상태", value: `${contractType || "계약"} · ${status || "-"}` },
        { name: "총 계약금액", value: formatWon(totalAmount) },
        ...(depositAmount !== undefined ? [{ name: "선금 / 초기납입", value: formatWon(depositAmount) }] : []),
        ...(balanceAmount !== undefined ? [{ name: "잔금 / 잔여원금", value: formatWon(balanceAmount) }] : []),
        ...(product ? [{ name: "상품 / 플랜", value: product, inline: false }] : []),
        ...(address ? [{ name: "설치 주소", value: address, inline: false }] : []),
        ...(summary ? [{ name: "상세 내용", value: summary, inline: false }] : []),
        { name: "소속 / 계약일", value: `${partnerName || "직영"} · ${contractDate || formatKstNow().slice(0, 10)}` },
      ],
    })
  );
}
