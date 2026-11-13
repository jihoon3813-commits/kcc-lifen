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

function getChannelSlug(channelName) {
  const s = String(channelName || "").toLowerCase();
  if (s.includes("네이버") && s.includes("블로그")) return "naver_blog";
  if (s.includes("네이버") && s.includes("브랜드")) return "naver_bs";
  if (s.includes("네이버") || s.includes("naver")) return "naver_sa";
  if (s.includes("당근") || s.includes("karrot") || s.includes("daangn")) return "daangn";
  if (s.includes("인스타") || s.includes("insta")) return "insta";
  if (s.includes("카카오") || s.includes("kakao")) return "kakao";
  if (s.includes("페이스북") || s.includes("메타") || s.includes("meta") || s.includes("facebook")) return "meta";
  if (s.includes("유튜브") || s.includes("youtube")) return "yt";
  if (s.includes("구글") || s.includes("google") || s.includes("gdn")) return "google";
  if (s.includes("오프라인") || s.includes("현수막") || s.includes("전단") || s.includes("qr")) return "qr";
  if (s.includes("파트너")) return "partner";
  return "ad";
}

export function generateLinkCode(channelName, requestedCode = "", existingCodes = new Set()) {
  const cleaned = sanitizeLinkCode(requestedCode);
  if (cleaned) return cleaned;

  const prefix = getChannelSlug(channelName);
  for (let i = 0; i < 8; i++) {
    const candidate = `${prefix}_${crypto.randomBytes(2).toString("hex")}`;
    if (!existingCodes.has(candidate)) return candidate;
  }
  return `${prefix}_${Date.now().toString(36).slice(-5)}`;
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
      targetUrl: ll.targetUrl || "/landing/",
      includeUtm: true,
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
