import crypto from "node:crypto";

export function sanitizeLinkCode(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

const SHORT_CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

function randomShortCode(length = 5) {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SHORT_CODE_CHARS[bytes[i] % SHORT_CODE_CHARS.length];
  }
  return out;
}

export function generateLinkCode(_channelName, requestedCode = "", existingCodes = new Set()) {
  const cleaned = sanitizeLinkCode(requestedCode);
  if (cleaned) return cleaned;

  for (let i = 0; i < 12; i++) {
    const candidate = randomShortCode(5);
    if (!existingCodes.has(candidate)) return candidate;
  }
  for (let i = 0; i < 12; i++) {
    const candidate = randomShortCode(6);
    if (!existingCodes.has(candidate)) return candidate;
  }
  return Date.now().toString(36).slice(-6);
}

export function formatProductsAndLinks(data, user) {
  const products = data.products || [];
  const links = data.landingLinks || [];
  const projects = data.projects || [];
  const events = data.landingEvents || [];
  const quotes = data.quotes || [];
  const contracts = data.contracts || [];

  const isPartner = user?.role === "partner" && user?.org_name;
  const prodById = new Map(products.map((p) => [Number(p.prodId), p]));
  const publishedProjectIds = new Set(
    quotes.filter((q) => q.status === "published").map((q) => q.projectId)
  );
  const contractProjectIds = new Set(contracts.map((c) => c.projectId));

  const visibleLinks = isPartner
    ? links.filter((ll) => ll.partnerName === user.org_name)
    : links;

  const formattedLinks = visibleLinks.map((ll) => {
    const prod = ll.productId ? prodById.get(Number(ll.productId)) : products[0];
    const eventViews = events.filter(
      (ev) =>
        (ev.eventType === "page_view" || ev.eventType === "view") &&
        (Number(ev.landingLinkId) === Number(ll.linkId) || (ll.code && ev.channel === ll.code))
    ).length;
    const views = Math.max(eventViews, Number(ll.clicks || 0));

    const linkProjects = projects.filter(
      (pr) =>
        Number(pr.landingLinkId) === Number(ll.linkId) ||
        (ll.code && pr.source === ll.code)
    );
    const leads = linkProjects.length;
    const quoteCount = linkProjects.filter((pr) => publishedProjectIds.has(pr.projectId)).length;
    const contractCount = linkProjects.filter((pr) => contractProjectIds.has(pr.projectId)).length;
    const conversionRate = views > 0 ? Number(((leads / views) * 100).toFixed(1)) : 0;

    return {
      id: ll.linkId,
      code: ll.code,
      productId: ll.productId || prod?.prodId || 1,
      productName: prod?.name || "KCC 홈씨씨 창호",
      productCategory: prod?.category || "창호",
      name: ll.name,
      channel: ll.channel,
      medium: "",
      campaign: ll.campaign || ll.name,
      partnerName: ll.partnerName || "직영",
      targetUrl: ll.targetUrl || "/",
      includeUtm: false,
      memo: "",
      isActive: ll.active !== false,
      createdAt: ll.createdAt || "",
      views,
      leads,
      quotes: quoteCount,
      contracts: contractCount,
      conversionRate,
    };
  });

  const formattedProducts = products.map((p) => {
    const views = events.filter(
      (ev) =>
        (ev.eventType === "page_view" || ev.eventType === "view") &&
        ev.productName === p.name
    ).length;
    const linkCount = formattedLinks.filter(
      (ll) => Number(ll.productId) === Number(p.prodId) || ll.productCategory === p.category
    ).length;

    return {
      id: p.prodId,
      name: p.name,
      code: p.code,
      category: p.category,
      desc: p.description || "",
      url: p.url || "/landing/",
      icon: p.category === "창호" ? "window" : p.category === "주방" ? "kitchen" : "bath",
      color: p.category === "창호" ? "#edf3f9" : p.category === "주방" ? "#f4f1ec" : "#edf4f1",
      views,
      linkCount,
      active: p.active !== false,
    };
  });

  return {
    products: formattedProducts,
    landingLinks: formattedLinks,
  };
}

export const DEFAULT_PRODUCTS = [
  {
    prodId: 1,
    name: "KCC 홈씨씨 창호",
    code: "PROD_WINDOW",
    category: "창호",
    description: "우리 집에 맞는 창호 교체, 상담부터 시공까지.",
    url: "/landing/",
    active: true,
  },
  {
    prodId: 2,
    name: "KCC 홈씨씨 키친",
    code: "PROD_KITCHEN",
    category: "주방",
    description: "생활의 중심이 되는 주방, 맞춤 리모델링 상담.",
    url: "",
    active: true,
  },
  {
    prodId: 3,
    name: "KCC 홈씨씨 욕실",
    code: "PROD_BATH",
    category: "욕실",
    description: "매일의 편안함을 만드는 욕실 리모델링.",
    url: "",
    active: true,
  },
];

export async function ensureDefaultProductsInConvex(convexClient, api) {
  for (const prod of DEFAULT_PRODUCTS) {
    await convexClient.mutation(api.crm.upsertProduct, prod);
  }
}
