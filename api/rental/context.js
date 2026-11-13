import { api } from "../../convex/_generated/api.js";
import { convexClient, setCors } from "../_lib/authHelper.js";
import { deriveCsrfToken, resolveCustomerViewer } from "../_lib/publicQuoteHelper.js";
import { maskPhone, buildRentalPlans } from "../../server/utils/mobileQuoteFormatter.js";

export const APPROVED_RENTAL_TERMS = [
  {
    id: "collection",
    version: "v2026.11.1",
    title: "[필수] 개인(신용)정보 수집·이용 동의",
    body: "라이프앤조이 및 KCC 홈씨씨 창호 렌탈 서비스는 렌탈 계약 체결, 설치 시공, 본인 확인, 심사 및 요금 청구·정산을 위해 성명, 연락처, 생년월일, 설치 주소, 신분증 사본, 전자서명 등 최소한의 개인정보를 수집·이용합니다. 보유 기간은 계약 종료 및 관련 법령에 따른 보존 기간까지입니다.",
  },
  {
    id: "inquiry",
    version: "v2026.11.1",
    title: "[필수] 개인(신용)정보 조회 동의",
    body: "렌탈 계약 심사 및 한도 확인을 위해 신용정보집중기관·신용조회회사로부터 개인신용정보를 조회하는 데 동의합니다. 조회 목적 달성 후 관련 법령에 따라 안전하게 관리됩니다.",
  },
  {
    id: "provision",
    version: "v2026.11.1",
    title: "[필수] 개인(신용)정보 제3자 제공 동의",
    body: "렌탈 금융 심사, 채권 관리, 시공 및 사후관리(A/S) 수행을 위해 제휴 금융·렌탈사 및 지정 시공 파트너사에 필요한 범위 내의 정보를 제공합니다.",
  },
];

export const RENTAL_TERMS_VERSION = "approved-2026.11-collection:v1,inquiry:v1,provision:v1";

const STATUS_LABELS = {
  received: "접수완료",
  reviewing: "심사중",
  supplement: "서류보완",
  approved: "심사승인",
  rejected: "심사반려",
  cancelled: "취소",
};

export function toPlanResponse(allPlans) {
  const mapOne = (p) => ({
    title: p.name,
    upfront: p.upfront,
    monthly: p.mainAmount,
    months: p.months,
    total: p.total,
  });
  return {
    plan111: mapOne(allPlans.plan111),
    plan222: mapOne(allPlans.plan222),
    plan333: mapOne(allPlans.plan333),
    lowupfront: mapOne(allPlans.lowupfront),
    lowmonthly: mapOne(allPlans.lowmonthly),
  };
}

export default async function handler(req, res) {
  setCors(res);
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const viewer = resolveCustomerViewer(req);
  if (!viewer) {
    return res.status(401).json({
      error: "본인확인 세션이 없거나 만료되었습니다. 다시 로그인해 주세요.",
    });
  }

  try {
    const bundle = await convexClient.query(api.quotes.getPublicBundleByToken, {
      accessToken: viewer.decoded.accessToken,
    });
    if (!bundle) {
      return res.status(404).json({ error: "유효한 발행 견적서를 찾을 수 없습니다." });
    }

    const { quote, project } = bundle;
    const allPlans = buildRentalPlans(quote.totalPrice, quote.discountAmount || 0);

    const allApps = await convexClient.query(api.rentals.list, {});
    const activeApp = (allApps || []).find(
      (a) =>
        Number(a.projectId) === Number(project.projectId) &&
        !["rejected", "cancelled", "심사반려", "취소"].includes(String(a.status || ""))
    );

    const activeApplication = activeApp
      ? {
          receiptId: activeApp.appNo,
          status: activeApp.status,
          statusLabel: STATUS_LABELS[activeApp.status] || activeApp.status || "접수완료",
          monthly: activeApp.monthlyFee,
          months: activeApp.rentalPeriod,
          submittedAt: activeApp.createdAt || "",
        }
      : null;

    return res.status(200).json({
      mode: "live",
      endpoint: "/api/rental/applications",
      csrfToken: deriveCsrfToken(viewer.token),
      approvedTerms: true,
      isLatestVersion: true,
      quote: {
        id: String(quote.version),
        projectId: project.projectId,
        quoteNo: String(project.projectId).padStart(4, "0"),
        version: `v${quote.version}`,
        quoteType: quote.quoteType || "가견적",
        customerName: project.customerName,
        phone: maskPhone(project.customerPhone),
        location: project.customerAddress || "",
        product: `KCC 홈씨씨 ${project.product || "창호"} 교체`,
        cashPrice: quote.totalPrice,
        publishedAt: quote.publishedAt || quote.createdAt || "",
      },
      plans: toPlanResponse(allPlans),
      termsVersion: RENTAL_TERMS_VERSION,
      terms: APPROVED_RENTAL_TERMS,
      activeApplication,
    });
  } catch (err) {
    console.error("[Vercel Convex] GET /api/rental/context error:", err);
    return res.status(500).json({ error: "렌탈 신청 정보를 불러오는 중 오류가 발생했습니다." });
  }
}
