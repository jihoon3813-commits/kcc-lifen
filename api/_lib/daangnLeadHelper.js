import { api } from "../../convex/_generated/api.js";
import { notifyNewCustomer } from "./discordHelper.js";

export const DEFAULT_DAANGN_SHEET_ID = "1dmgNFAeoS959uLN_nFp4TFEe0qSiAHn-3L7VfUqopf4";
export const DEFAULT_DAANGN_GID = "0";
export const DAANGN_CHANNEL = "당근마켓";
export const DAANGN_CAMPAIGN = "상담리드";

/**
 * Normalize Korean phone numbers from Daangn Lead Form / Google Sheets.
 * Handles "+82 10-1234-5678", "821012345678", "1012345678" (leading 0 stripped by Sheets),
 * "010-1234-5678", "01012345678", etc.
 */
export function normalizeKrPhone(raw) {
  if (raw === null || raw === undefined) return "";
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("82") && digits.length >= 11) {
    digits = "0" + digits.slice(2);
  } else if (digits.startsWith("10") && (digits.length === 9 || digits.length === 10)) {
    digits = "0" + digits;
  }

  if (!/^01[016789]\d{7,8}$/.test(digits)) {
    return "";
  }

  return digits.length === 11
    ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    : `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * RFC-4180 compliant CSV parser that returns an array of row objects keyed by header row.
 */
export function parseCsvToRowObjects(csvText) {
  const text = String(csvText || "").replace(/^\uFEFF/, "").trim();
  if (!text) return [];

  const matrix = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(cell.trim());
        cell = "";
      } else if (ch === "\r" && next === "\n") {
        row.push(cell.trim());
        matrix.push(row);
        row = [];
        cell = "";
        i++;
      } else if (ch === "\n" || ch === "\r") {
        row.push(cell.trim());
        matrix.push(row);
        row = [];
        cell = "";
      } else {
        cell += ch;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    matrix.push(row);
  }

  const nonEmptyRows = matrix.filter((r) => r.some((c) => String(c || "").trim() !== ""));
  if (nonEmptyRows.length < 2) return [];

  // Find header row (first row that has at least 2 non-empty cells and no valid phone number in the first 3 cells)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, nonEmptyRows.length); i++) {
    const candidate = nonEmptyRows[i];
    const hasPhoneCell = candidate.some((c) => Boolean(normalizeKrPhone(c)));
    const nonEmptyCount = candidate.filter((c) => String(c || "").trim() !== "").length;
    if (!hasPhoneCell && nonEmptyCount >= 2) {
      headerIdx = i;
      break;
    }
  }

  const headers = nonEmptyRows[headerIdx].map((h, idx) => String(h || "").trim() || `col_${idx + 1}`);
  const result = [];

  for (let i = headerIdx + 1; i < nonEmptyRows.length; i++) {
    const r = nonEmptyRows[i];
    if (!r.some((c) => String(c || "").trim() !== "")) continue;
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = r[c] !== undefined ? String(r[c]).trim() : "";
    }
    result.push(obj);
  }

  return result;
}

const NAME_KEYS = ["이름", "성함", "고객명", "신청자", "성명", "닉네임", "name", "full_name", "customer_name", "user_name"];
const PHONE_KEYS = ["연락처", "전화번호", "휴대폰", "휴대전화", "핸드폰", "전화", "phone", "phone_number", "mobile", "tel", "contact"];
const ADDRESS_KEYS = [
  "주소", "지역", "설치지역", "시공지역", "거주지역", "거주지", "동네", "시/도", "시도",
  "시/군/구", "시군구", "구/군", "아파트", "단지명", "건물명", "상세주소",
  "address", "region", "location", "city", "district", "apartment"
];
const PRODUCT_KEYS = ["상품", "상품군", "품목", "관심상품", "시공품목", "product", "category"];
const NOTE_KEYS = ["평수", "평형", "희망평형", "공간", "교체공간", "시공범위", "문의", "메모", "상담내용", "희망사항", "비고", "note", "memo", "size", "scope"];
const IGNORE_META_KEYS = [
  "타임스탬프", "일시", "제출일시", "접수일시", "생성일시", "신청일시", "날짜", "시간",
  "timestamp", "created_time", "created_at", "submitted_at", "date",
  "id", "lead_id", "row_id", "번호", "순번", "no",
  "캠페인", "광고", "매체", "채널", "구분", "상태", "동기화", "등록여부", "synced",
  "campaign", "ad_name", "form_name", "platform", "source", "adchannel", "adcampaign"
];

function matchesAnyKeyword(keyLower, keywords) {
  return keywords.some((kw) => keyLower === kw || keyLower.includes(kw));
}

/**
 * Extract structured customer lead fields from an arbitrary Google Sheet row object or webhook payload.
 */
export function extractLeadFromRow(rawRow) {
  if (!rawRow || typeof rawRow !== "object") return null;

  // Support { headers: [...], values: [...] } payload from Google Apps Script
  let rowObj = rawRow;
  if (Array.isArray(rawRow.headers) && Array.isArray(rawRow.values)) {
    rowObj = {};
    rawRow.headers.forEach((h, i) => {
      const k = String(h || "").trim() || `col_${i + 1}`;
      rowObj[k] = rawRow.values[i] !== undefined && rawRow.values[i] !== null ? String(rawRow.values[i]).trim() : "";
    });
  } else if (Array.isArray(rawRow)) {
    rowObj = {};
    rawRow.forEach((v, i) => {
      rowObj[`col_${i + 1}`] = v !== undefined && v !== null ? String(v).trim() : "";
    });
  }

  const entries = Object.entries(rowObj)
    .map(([k, v]) => [String(k || "").trim(), v === null || v === undefined ? "" : String(v).trim()])
    .filter(([, v]) => v !== "");

  if (entries.length === 0) return null;

  let name = "";
  let phone = "";
  const addressParts = [];
  let product = "";
  const noteParts = [];
  const usedKeys = new Set();

  // 1. Phone detection (by key first, then by value pattern)
  for (const [k, v] of entries) {
    const kl = k.toLowerCase().replace(/\s+/g, "_");
    if (matchesAnyKeyword(kl, PHONE_KEYS)) {
      const norm = normalizeKrPhone(v);
      if (norm) {
        phone = norm;
        usedKeys.add(k);
        break;
      }
    }
  }
  if (!phone) {
    for (const [k, v] of entries) {
      const norm = normalizeKrPhone(v);
      if (norm) {
        phone = norm;
        usedKeys.add(k);
        break;
      }
    }
  }
  if (!phone) return null;

  // 2. Name detection
  for (const [k, v] of entries) {
    if (usedKeys.has(k)) continue;
    const kl = k.toLowerCase().replace(/\s+/g, "_");
    if (matchesAnyKeyword(kl, NAME_KEYS)) {
      name = v;
      usedKeys.add(k);
      break;
    }
  }

  // 3. Address / Region detection
  for (const [k, v] of entries) {
    if (usedKeys.has(k)) continue;
    const kl = k.toLowerCase().replace(/\s+/g, "_");
    if (matchesAnyKeyword(kl, ADDRESS_KEYS)) {
      if (!addressParts.includes(v)) addressParts.push(v);
      usedKeys.add(k);
    }
  }

  // 4. Product detection
  for (const [k, v] of entries) {
    if (usedKeys.has(k)) continue;
    const kl = k.toLowerCase().replace(/\s+/g, "_");
    if (matchesAnyKeyword(kl, PRODUCT_KEYS)) {
      if (v.includes("주방")) product = "주방";
      else if (v.includes("욕실") || v.includes("바스")) product = "욕실";
      else if (v.includes("창호") || v.includes("샷시") || v.includes("샤시")) product = "창호";
      else {
        noteParts.push(v);
      }
      usedKeys.add(k);
    }
  }

  // 5. Fallback for positional / unnamed columns if name or address was not matched by header keyword
  if (!name) {
    for (const [k, v] of entries) {
      if (usedKeys.has(k)) continue;
      const kl = k.toLowerCase().replace(/\s+/g, "_");
      if (matchesAnyKeyword(kl, IGNORE_META_KEYS) || matchesAnyKeyword(kl, NOTE_KEYS)) continue;
      // Korean name heuristic: 2~6 chars, no digits
      if (v.length >= 2 && v.length <= 10 && !/\d/.test(v) && !/(시|도|군|구|동|읍|면|평)/.test(v)) {
        name = v;
        usedKeys.add(k);
        break;
      }
    }
  }

  if (addressParts.length === 0) {
    for (const [k, v] of entries) {
      if (usedKeys.has(k)) continue;
      const kl = k.toLowerCase().replace(/\s+/g, "_");
      if (matchesAnyKeyword(kl, IGNORE_META_KEYS)) continue;
      if (/(서울|경기|인천|부산|대구|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주|시\s|구\s|군\s|동\s|읍\s|면\s|아파트)/.test(v)) {
        addressParts.push(v);
        usedKeys.add(k);
      }
    }
  }

  // 6. Remaining meaningful columns go into note (e.g., "30평대", replacement scope, Q&A)
  for (const [k, v] of entries) {
    if (usedKeys.has(k)) continue;
    const kl = k.toLowerCase().replace(/\s+/g, "_");
    if (matchesAnyKeyword(kl, IGNORE_META_KEYS)) continue;
    if (matchesAnyKeyword(kl, NOTE_KEYS) || /^col_\d+$/.test(kl)) {
      noteParts.push(v);
    } else {
      noteParts.push(`${k}: ${v}`);
    }
    usedKeys.add(k);
  }

  const cleanName = (name || "당근상담고객").trim();
  const cleanAddress = addressParts.join(" ").trim() || "지역 미기재 (상담 확인)";
  const cleanProduct = product || "창호";
  const cleanNote = noteParts.join(" / ").trim();

  return {
    name: cleanName,
    phone,
    address: cleanAddress,
    product: cleanProduct,
    note: cleanNote,
    source: DAANGN_CHANNEL,
    adChannel: DAANGN_CHANNEL,
    adCampaign: DAANGN_CAMPAIGN,
  };
}

/**
 * Fetch CSV from a Google Sheet (requires link sharing enabled as Viewer).
 */
export async function fetchGoogleSheetRows(sheetId = DEFAULT_DAANGN_SHEET_ID, gid = DEFAULT_DAANGN_GID) {
  const cleanSheetId = String(sheetId || DEFAULT_DAANGN_SHEET_ID).trim();
  const cleanGid = String(gid ?? DEFAULT_DAANGN_GID).trim() || "0";
  const exportUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(cleanSheetId)}/export?format=csv&gid=${encodeURIComponent(cleanGid)}`;

  const resp = await fetch(exportUrl, {
    method: "GET",
    headers: {
      "User-Agent": "KCC-HomeCC-CRM-SheetSync/1.0",
      Accept: "text/csv,text/plain,*/*",
    },
    redirect: "follow",
  });

  if (resp.status === 401 || resp.status === 403) {
    const err = new Error(
      "구글 시트 접근 권한이 없습니다. 시트 우측 상단 [공유] → [일반 액세스: 링크가 있는 모든 사용자(뷰어)]로 설정하시거나, 시트 내 [확장 프로그램 > Apps Script] 실시간 웹훅을 사용해 주세요."
    );
    err.status = 403;
    err.code = "SHEET_PRIVATE";
    throw err;
  }

  if (!resp.ok) {
    const err = new Error(`구글 시트 데이터를 불러오지 못했습니다 (HTTP ${resp.status}).`);
    err.status = resp.status;
    throw err;
  }

  const csvText = await resp.text();
  // If Google redirected to a login HTML page instead of returning CSV
  if (csvText.trim().startsWith("<!DOCTYPE html") || csvText.includes("accounts.google.com/ServiceLogin")) {
    const err = new Error(
      "구글 시트가 비공개 상태입니다. 시트 우측 상단 [공유] → [링크가 있는 모든 사용자(뷰어)]로 변경하시거나, [Apps Script 실시간 웹훅]을 설정해 주세요."
    );
    err.status = 403;
    err.code = "SHEET_PRIVATE";
    throw err;
  }

  return parseCsvToRowObjects(csvText);
}

/**
 * Sync an array of raw row objects into Convex CRM with source="당근마켓", adCampaign="상담리드".
 * Automatically deduplicates by normalized phone number so existing customers are never duplicated.
 */
export async function syncDaangnRowsToConvex(convexClient, rawRows = [], options = {}) {
  const leads = [];
  for (const r of rawRows) {
    const parsed = extractLeadFromRow(r);
    if (parsed) leads.push(parsed);
  }

  if (leads.length === 0) {
    return {
      success: true,
      totalRows: rawRows.length,
      validLeads: 0,
      insertedCount: 0,
      skippedCount: 0,
      inserted: [],
      skipped: [],
      message: "동기화할 유효한 고객 리드(연락처 포함)가 없습니다.",
    };
  }

  // Query existing projects to prevent duplicates by normalized phone number
  const data = await convexClient.query(api.crm.listCustomersData, {});
  const existingProjects = Array.isArray(data?.projects) ? data.projects : [];
  const existingPhones = new Set();

  for (const p of existingProjects) {
    const norm = normalizeKrPhone(p.customerPhone);
    if (norm) existingPhones.add(norm);
  }

  const inserted = [];
  const skipped = [];

  for (const lead of leads) {
    if (existingPhones.has(lead.phone)) {
      skipped.push({
        name: lead.name,
        phone: lead.phone,
        reason: "이미 등록된 연락처",
      });
      continue;
    }

    existingPhones.add(lead.phone);

    const created = await convexClient.mutation(api.crm.createCustomerProject, {
      name: lead.name,
      phone: lead.phone,
      address: lead.address,
      product: lead.product || "창호",
      owner: options.owner || "미배정",
      partner: options.partner || "직영",
      orgId: 1,
      source: DAANGN_CHANNEL,
      adCampaign: DAANGN_CAMPAIGN,
      note: lead.note || "",
      authorName: "당근 리드폼",
    });

    const projectId = created?.projectId;
    inserted.push({
      projectId,
      name: lead.name,
      phone: lead.phone,
      address: lead.address,
      product: lead.product,
      note: lead.note,
      adChannel: DAANGN_CHANNEL,
      adCampaign: DAANGN_CAMPAIGN,
    });

    await notifyNewCustomer({
      category: "당근마켓 > 상담리드 자동 접수",
      receiptId: projectId,
      customerName: lead.name,
      phone: lead.phone,
      address: lead.address,
      product: lead.product || "창호",
      channel: `${DAANGN_CHANNEL} (${DAANGN_CAMPAIGN})`,
      partner: options.partner || "직영",
      owner: options.owner || "미배정",
      note: lead.note || "",
    });
  }

  return {
    success: true,
    totalRows: rawRows.length,
    validLeads: leads.length,
    insertedCount: inserted.length,
    skippedCount: skipped.length,
    inserted,
    skipped,
    message:
      inserted.length > 0
        ? `당근마켓 > 상담리드 고객 ${inserted.length}명이 신규 등록되었습니다.${skipped.length > 0 ? ` (중복 ${skipped.length}건 제외)` : ""}`
        : `신규로 추가할 고객이 없습니다. (기존 등록 중복 ${skipped.length}건)`,
  };
}
