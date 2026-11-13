export const DEFAULT_RENTAL_PRIVACY_CONTENT = `[필수] 렌탈 개인정보 수집·이용 및 제공 동의서 (KCC홈씨씨)

1. 수집 및 이용 목적
- KCC 홈씨씨 창호·인테리어 렌탈 서비스 신청 접수, 적격 확인, 본인 확인
- 렌탈 계약 체결 및 유지 관리, 월 렌탈료 정산 및 청구
- 시공 현장 실측, 일정 조율 및 사후 품질보증(A/S) 제공

2. 수집하는 개인정보 항목
- 기본 식별정보: 고객 성명, 연락처(휴대전화번호), 생년월일, 시공 주소
- 계약 및 서명정보: 모바일 전자서명 이미지, 신청일자, 선택 렌탈 조건

3. 보유 및 이용 기간
- 렌탈 계약 성립 시: 상법 및 전자상거래법 등 관계 법령에 따른 5년간 보존 후 파기
- 미체결 또는 취소 시: 처리 완료일로부터 즉시 안전하게 영구 파기

4. 동의 거부 권리 및 불이익
- 귀하는 상기 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있습니다. 단, 필수 정보 수집에 동의하지 않으실 경우 렌탈 신청 및 계약 체결이 불가능합니다.`;

export const PRESERVED_RENTAL_FORM_FIELDS = [
  { id: "f_date_p1_ie2q", key: "date", label: "날짜", page: 1, x: 16.9, y: 90.1, w: 18.5, h: 2.3, fontSize: 14, fontWeight: "normal", color: "#1a202c", align: "center", format: "YYYY년 MM월 DD일", enabled: true },
  { id: "f_name_p1_mxle", key: "name", label: "성명", page: 1, x: 46.4, y: 90.3, w: 13.6, h: 1.7, fontSize: 15, fontWeight: "bold", color: "#1a202c", align: "center", enabled: true },
  { id: "f_signature_p1_4ury", key: "signature", label: "서명", page: 1, x: 56.6, y: 89.9, w: 14.5, h: 2.7, fontSize: 14, fontWeight: "normal", color: "#1a202c", align: "center", enabled: true },
  { id: "f_birthDate_p1_ax34", key: "birthDate", label: "생년월일", page: 1, x: 75.1, y: 90, w: 16.4, h: 2.5, fontSize: 14, fontWeight: "normal", color: "#1a202c", align: "center", format: "YYYY-MM-DD", enabled: true },
  { id: "f_phone_p1_kxkh", key: "phone", label: "연락처", page: 1, x: 46.2, y: 92.3, w: 20.7, h: 2.1, fontSize: 14, fontWeight: "normal", color: "#1a202c", align: "center", enabled: true },
  { id: "f_name_p2_mwd9gsl8_m6d", key: "name", label: "성명", page: 2, x: 62, y: 83.2, w: 16, h: 3.6, fontSize: 15, fontWeight: "bold", color: "#1a202c", align: "center", enabled: true },
  { id: "f_signature_p2_mwd9gtkp_cd4", key: "signature", label: "서명", page: 2, x: 78.5, y: 81.2, w: 16, h: 6.8, fontSize: 14, fontWeight: "normal", color: "#1a202c", align: "center", enabled: true },
  { id: "f_name_p3_mwd9h1yq_v6u", key: "name", label: "성명", page: 3, x: 62, y: 83.2, w: 16, h: 3.6, fontSize: 15, fontWeight: "bold", color: "#1a202c", align: "center", enabled: true },
  { id: "f_signature_p3_mwd9h2qx_bb8", key: "signature", label: "서명", page: 3, x: 78.5, y: 81.2, w: 16, h: 6.8, fontSize: 14, fontWeight: "normal", color: "#1a202c", align: "center", enabled: true },
  { id: "f_date_p3_mwd9h3r9_z2i", key: "date", label: "날짜", page: 3, x: 58, y: 78.5, w: 32, h: 3.6, fontSize: 14, fontWeight: "normal", color: "#1a202c", align: "center", format: "YYYY년 MM월 DD일", enabled: true },
];

export const DEFAULT_RENTAL_FORM = {
  id: "rental_privacy",
  name: "(렌탈) 개인정보 동의서",
  type: "rental",
  version: 7,
  pdfPath: "/uploads/forms/form_1794469868135_ctjfux.pdf",
  pdfStorageId: null,
  fileName: "BSON_제휴영업팀 신용정보동의서_에디터용.pdf",
  text: DEFAULT_RENTAL_PRIVACY_CONTENT,
  fieldsConfig: PRESERVED_RENTAL_FORM_FIELDS,
  enabled: true,
  updatedAt: "",
};

export function hasSettingsAccess(auth) {
  if (!auth?.user) return false;
  if (auth.user.role === "hq_admin") return true;
  const menus = auth.user.allowed_menus || [];
  return Array.isArray(menus) && menus.includes("settings");
}

export function serializeConsentForm(f) {
  let fieldsConfig = null;
  if (f.fieldsConfigJson) {
    try {
      const parsed = JSON.parse(f.fieldsConfigJson);
      if (Array.isArray(parsed) || (parsed && typeof parsed === "object")) {
        fieldsConfig = parsed;
      }
    } catch {}
  }

  const isDefaultRental = f.formId === "rental_privacy";
  const pdfPath = f.pdfStorageId
    ? `/api/settings/forms/pdf?storageId=${encodeURIComponent(f.pdfStorageId)}`
    : f.pdfPath || (isDefaultRental ? DEFAULT_RENTAL_FORM.pdfPath : "");

  return {
    id: f.formId,
    name: f.name,
    type: f.type || "rental",
    pdfPath,
    pdfStorageId: f.pdfStorageId || null,
    fileName:
      f.fileName || (isDefaultRental ? DEFAULT_RENTAL_FORM.fileName : ""),
    text:
      f.text ||
      (isDefaultRental ? DEFAULT_RENTAL_PRIVACY_CONTENT : ""),
    fieldsConfig:
      fieldsConfig ||
      (isDefaultRental ? PRESERVED_RENTAL_FORM_FIELDS : []),
    version: f.version || 1,
    enabled: f.enabled !== false,
    updatedAt: f.updatedAt || "",
  };
}
