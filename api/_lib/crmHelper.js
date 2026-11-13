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
  const parts = raw.split(" · ").map((s) => s.trim()).filter(Boolean);
  let planSummary = "";
  let topics = [];
  let preferredTime = "상관없음";
  let memo = "";

  for (const part of parts) {
    if (part.startsWith("선택 조건:")) {
      planSummary = part.slice("선택 조건:".length).trim();
    } else if (part.startsWith("문의 항목:")) {
      const tStr = part.slice("문의 항목:".length).trim();
      topics = tStr ? tStr.split(",").map((t) => t.trim()).filter(Boolean) : [];
    } else if (part.startsWith("희망 연락시간:")) {
      preferredTime = part.slice("희망 연락시간:".length).trim() || "상관없음";
    } else if (part.startsWith("고객 메모:")) {
      memo = part.slice("고객 메모:".length).trim();
    }
  }

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
