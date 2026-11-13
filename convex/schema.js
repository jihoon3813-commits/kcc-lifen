import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 1. 본사 및 파트너 조직
  organizations: defineTable({
    orgId: v.optional(v.number()),
    name: v.string(),
    type: v.string(), // 'hq' | 'partner'
    code: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    parentId: v.optional(v.number()),
    level: v.optional(v.number()),
    createdAt: v.optional(v.string()),
  }).index("by_name", ["name"]),

  // 2. 관리자 및 파트너 계정
  users: defineTable({
    userId: v.optional(v.number()),
    orgId: v.optional(v.number()),
    orgName: v.optional(v.string()),
    username: v.string(),
    passwordHash: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.string(), // 'hq_admin' | 'consultant' | 'estimator' | 'partner' | 'accountant'
    allowedMenus: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.optional(v.string()),
  }).index("by_username", ["username"]),

  // 3. 고객 정보
  customers: defineTable({
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    address: v.string(),
    marketingAgreed: v.optional(v.boolean()),
    createdAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
  }).index("by_phone", ["phone"]),

  // 4. 프로젝트 / 공사건
  projects: defineTable({
    projectId: v.number(), // 3101, 3102...
    customerName: v.string(),
    customerPhone: v.string(),
    customerAddress: v.string(),
    title: v.optional(v.string()),
    product: v.string(), // '창호', '주방', '욕실'
    status: v.string(), // '신규접수', '실측예정', '실측완료', '견적발송', '계약완료', '시공완료' 등
    label: v.string(),
    source: v.string(),
    partnerName: v.string(),
    orgId: v.optional(v.number()),
    landingLinkId: v.optional(v.number()),
    adChannel: v.optional(v.string()),
    adCampaign: v.optional(v.string()),
    ownerName: v.string(),
    measureDate: v.optional(v.string()),
    buildDate: v.optional(v.string()),
    roughQuoteUrl: v.optional(v.string()),
    finalQuoteUrl: v.optional(v.string()),
    drawingUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    note: v.optional(v.string()),
    createdAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
  }).index("by_projectId", ["projectId"])
    .index("by_customerPhone", ["customerPhone"]),

  // 5. 견적서
  quotes: defineTable({
    projectId: v.number(),
    version: v.number(),
    title: v.string(),
    quoteType: v.string(), // '가견적' | '최종견적'
    status: v.string(), // 'draft' | 'published'
    totalCost: v.number(),
    supplyCost: v.number(),
    marginRate: v.number(),
    materialSubtotal: v.number(),
    extraSubtotal: v.number(),
    salePrice: v.number(),
    vat: v.number(),
    originalPrice: v.number(),
    totalPrice: v.number(),
    discountAmount: v.number(),
    metaJson: v.optional(v.string()),
    memo: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    publishedAt: v.optional(v.string()),
    createdAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
  }).index("by_project", ["projectId"])
    .index("by_accessToken", ["accessToken"]),

  // 6. 견적 품목
  quoteItems: defineTable({
    projectId: v.number(),
    quoteVersion: v.number(),
    sortOrder: v.number(),
    name: v.string(),
    spec: v.optional(v.string()),
    category: v.string(),
    detailJson: v.optional(v.string()),
    quantity: v.number(),
    marginRate: v.number(),
    costUnitPrice: v.number(),
    costTotal: v.number(),
    saleUnitPrice: v.number(),
    saleTotal: v.number(),
  }).index("by_project", ["projectId"]),

  // 7. 전자계약
  contracts: defineTable({
    contractNo: v.string(),
    projectId: v.number(),
    customerName: v.string(),
    customerPhone: v.string(),
    status: v.string(), // 'pending', 'signed', 'completed', 'cancelled'
    totalAmount: v.number(),
    depositAmount: v.number(),
    balanceAmount: v.number(),
    contractDate: v.optional(v.string()),
    signedAt: v.optional(v.string()),
    createdAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
  }).index("by_contractNo", ["contractNo"])
    .index("by_project", ["projectId"]),

  // 8. 홈씨씨 안심 렌탈 신청서
  rentalApplications: defineTable({
    appNo: v.string(),
    projectId: v.optional(v.number()),
    quoteId: v.optional(v.number()),
    customerName: v.string(),
    customerPhone: v.string(),
    customerBirth: v.optional(v.string()),
    installationAddress: v.string(),
    productSummary: v.optional(v.string()),
    monthlyFee: v.number(),
    rentalPeriod: v.number(), // 24, 36, 48, 60
    totalRentalFee: v.number(),
    status: v.string(), // '접수대기', '심사진행', '승인완료', '심사부결', '계약완료' 등
    score: v.optional(v.number()),
    grade: v.optional(v.string()),
    underwritingMemo: v.optional(v.string()),
    createdAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
  }).index("by_appNo", ["appNo"])
    .index("by_status", ["status"]),

  // 9. 상담/피드백 메모
  consultations: defineTable({
    projectId: v.number(),
    authorName: v.string(),
    type: v.string(), // 'notes' | 'feedback'
    content: v.string(),
    isImportant: v.boolean(),
    createdAt: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  // 10. 시스템 설정
  appSettings: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.optional(v.string()),
  }).index("by_key", ["key"]),

  // 11. 양식 관리 (개인정보 동의서 등)
  consentForms: defineTable({
    formId: v.string(), // 'rental-privacy-v1', etc.
    name: v.string(),
    type: v.string(),
    pdfPath: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fieldsConfigJson: v.optional(v.string()), // JSON stringified fieldsConfig
    version: v.number(),
    enabled: v.boolean(),
    createdAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
  }).index("by_formId", ["formId"]),

  // 12. 진행라벨 관리
  systemLabels: defineTable({
    name: v.string(),
    color: v.string(),
    sortOrder: v.number(),
  }).index("by_name", ["name"]),

  // 13. 진행구분 관리
  systemStages: defineTable({
    name: v.string(),
    sortOrder: v.number(),
  }).index("by_name", ["name"]),

  // 14. 계약·수납상태 관리
  systemContractStatuses: defineTable({
    name: v.string(),
    color: v.string(),
    sortOrder: v.number(),
  }).index("by_name", ["name"]),

  // 15. 고객 상담 신청 접수
  customerConsultRequests: defineTable({
    name: v.string(),
    phone: v.string(),
    address: v.optional(v.string()),
    product: v.optional(v.string()),
    status: v.string(),
    source: v.optional(v.string()),
    createdAt: v.optional(v.string()),
  }).index("by_phone", ["phone"]),

  // 16. 상품 관리
  products: defineTable({
    prodId: v.number(),
    name: v.string(),
    code: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
    url: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.optional(v.string()),
  }).index("by_prodId", ["prodId"])
    .index("by_code", ["code"]),

  // 17. 광고/랜딩 링크 관리
  landingLinks: defineTable({
    linkId: v.number(),
    productId: v.optional(v.number()),
    code: v.string(),
    name: v.string(),
    channel: v.string(),
    campaign: v.optional(v.string()),
    partnerName: v.optional(v.string()),
    targetUrl: v.string(),
    clicks: v.number(),
    active: v.boolean(),
    createdAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
  }).index("by_linkId", ["linkId"])
    .index("by_code", ["code"]),

  // 18. 랜딩 유입/전환 이벤트
  landingEvents: defineTable({
    eventType: v.string(),
    productName: v.optional(v.string()),
    channel: v.optional(v.string()),
    partnerName: v.optional(v.string()),
    landingLinkId: v.optional(v.number()),
    campaignName: v.optional(v.string()),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    createdAt: v.optional(v.string()),
  }).index("by_eventType", ["eventType"]),

  // 19. 견적서 열람 이력
  quoteViews: defineTable({
    projectId: v.number(),
    quoteId: v.optional(v.number()),
    accessToken: v.optional(v.string()),
    viewedAt: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  // 20. 견적서 발송 이력
  quoteDispatches: defineTable({
    projectId: v.number(),
    quoteId: v.optional(v.number()),
    channel: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    recipientPhone: v.optional(v.string()),
    message: v.optional(v.string()),
    quoteUrl: v.optional(v.string()),
    provider: v.optional(v.string()),
    status: v.string(),
    sentBy: v.optional(v.string()),
    createdAt: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  // 21. 감사 로그
  auditLogs: defineTable({
    projectId: v.optional(v.number()),
    userName: v.optional(v.string()),
    action: v.string(),
    detail: v.optional(v.string()),
    createdAt: v.optional(v.string()),
  }).index("by_project", ["projectId"]),
});
