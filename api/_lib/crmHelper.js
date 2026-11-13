export function isPartnerAllowed(auth, project, organizations = []) {
  if (!auth?.user || auth.user.role !== "partner") return true;
  const partnerOrgId = auth.user.org_id;
  if (project.orgId && Number(project.orgId) === Number(partnerOrgId)) return true;

  const myOrg = organizations.find((o) => Number(o.orgId) === Number(partnerOrgId));
  const allowedNames = new Set(
    organizations
      .filter((o) => Number(o.parentId) === Number(partnerOrgId))
      .map((o) => o.name)
  );
  if (myOrg) allowedNames.add(myOrg.name);
  if (auth.user.org_name) allowedNames.add(auth.user.org_name);

  return allowedNames.has(project.partnerName);
}

export function formatKstDateSlice(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return String(isoStr).slice(0, 10);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export function formatShortKst(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return String(isoStr);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kst.getUTCDate()).padStart(2, "0");
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mi = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${mm}.${dd} ${hh}:${mi}`;
}

export function parseQuoteInquiry(doc) {
  const raw = String(doc?.content || "");
  const extractSegment = (label, nextLabels) => {
    const startToken = `${label}:`;
    const startIdx = raw.indexOf(startToken);
    if (startIdx === -1) return "";
    const valueStart = startIdx + startToken.length;
    let endIdx = raw.length;
    for (const next of nextLabels) {
      const idx = raw.indexOf(` · ${next}:`, valueStart);
      if (idx !== -1 && idx < endIdx) endIdx = idx;
    }
    return raw.slice(valueStart, endIdx).trim();
  };

  const planSummary = extractSegment("선택 조건", ["문의 항목", "희망 연락시간", "고객 메모"]);
  const tStr = extractSegment("문의 항목", ["희망 연락시간", "고객 메모"]);
  const topics = tStr ? tStr.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const preferredTime = extractSegment("희망 연락시간", ["고객 메모"]) || "상관없음";
  const memo = extractSegment("고객 메모", []);

  return {
    id: doc?._id ? String(doc._id) : `${doc?.projectId || 0}-${doc?.createdAt || ""}`,
    projectId: Number(doc?.projectId || 0),
    authorName: doc?.authorName || "",
    planSummary,
    topics,
    preferredTime,
    memo,
    createdAt: doc?.createdAt || "",
    createdAtText: formatShortKst(doc?.createdAt || ""),
    rawContent: raw,
  };
}

export const RENTAL_STATUS_LABELS = {
  received: "접수 완료",
  review: "서류 확인 중",
  reviewing: "서류 확인 중",
  needs_info: "보완 요청",
  supplement: "보완 요청",
  screening: "심사 중",
  confirmed: "계약 확정",
  approved: "계약 확정",
  rejected: "진행 불가",
  cancelled: "취소",
};

const KR_TO_RENTAL_CODE = {
  "신규 접수": "received",
  "접수 완료": "received",
  "접수완료": "received",
  "서류 확인 중": "review",
  "서류검토": "review",
  "보완 요청": "needs_info",
  "보완요청": "needs_info",
  "서류보완": "needs_info",
  "심사 중": "screening",
  "심사중": "screening",
  "계약 확정": "confirmed",
  "심사승인": "confirmed",
  "약정완료": "confirmed",
  "진행 불가": "rejected",
  "심사반려": "rejected",
  "반려": "rejected",
  "취소": "cancelled",
  "부결": "cancelled",
};

export function normalizeRentalStatusCode(input) {
  const s = String(input || "").trim();
  if (!s) return "received";
  if (s === "reviewing") return "review";
  if (s === "supplement") return "needs_info";
  if (s === "approved") return "confirmed";
  if (RENTAL_STATUS_LABELS[s]) return s;
  return KR_TO_RENTAL_CODE[s] || "received";
}

export function getRentalStatusLabel(input) {
  const code = normalizeRentalStatusCode(input);
  return RENTAL_STATUS_LABELS[code] || String(input || "접수 완료");
}

export function maskBirthDate(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length >= 6) {
    const yy = digits.length === 8 ? digits.slice(0, 4) : digits.slice(0, 2);
    return `${yy}-**-**`;
  }
  return "****-**-**";
}

export function resolveProjectAttribution(project, linkById, linkByCode) {
  const src = String(project?.source || "").trim();
  const rawAdCh = String(project?.adChannel || "").trim();
  const ll =
    (project?.landingLinkId ? linkById?.get(Number(project.landingLinkId)) : null) ||
    (src ? linkByCode?.get(src) : null) ||
    (rawAdCh ? linkByCode?.get(rawAdCh) : null) ||
    null;

  const isUnresolvedOrCode =
    !rawAdCh ||
    (ll?.code && rawAdCh === ll.code) ||
    rawAdCh === "랜딩페이지" ||
    rawAdCh === "기본 랜딩(직접유입)" ||
    rawAdCh === "기본 랜딩(미분류)";

  let resolvedChannel = rawAdCh;
  if (isUnresolvedOrCode && ll?.channel) {
    resolvedChannel = ll.channel;
  } else if (!resolvedChannel) {
    resolvedChannel =
      ll?.channel ||
      (src === "랜딩페이지" ? "기본 랜딩(미분류)" : src || "직접등록");
  }

  return {
    link: ll,
    adChannel: resolvedChannel,
    adCampaign: project?.adCampaign || ll?.name || "",
    landingLinkId: project?.landingLinkId || ll?.linkId || null,
    landingLinkCode: ll?.code || "",
  };
}
