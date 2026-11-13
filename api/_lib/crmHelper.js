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
