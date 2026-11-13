import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// 1. Customers & Projects
// ---------------------------------------------------------------------------

export const listCustomersData = query({
  args: {},
  handler: async (ctx) => {
    const [projects, quotes, landingLinks, quoteViews, quoteDispatches, organizations] = await Promise.all([
      ctx.db.query("projects").collect(),
      ctx.db.query("quotes").collect(),
      ctx.db.query("landingLinks").collect(),
      ctx.db.query("quoteViews").collect(),
      ctx.db.query("quoteDispatches").collect(),
      ctx.db.query("organizations").collect(),
    ]);

    return {
      projects: projects.sort((a, b) => b.projectId - a.projectId),
      quotes: quotes.filter((q) => q.status === "published"),
      landingLinks,
      quoteViews,
      quoteDispatches: quoteDispatches.filter((d) => d.status === "sent"),
      organizations,
    };
  },
});

export const getCustomerDetail = query({
  args: { projectId: v.number() },
  handler: async (ctx, args) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .first();

    if (!project) return null;

    const [notes, quotes, quoteItems, contracts, dispatches, auditLogs, landingLinks, quoteViews] = await Promise.all([
      ctx.db.query("consultations").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect(),
      ctx.db.query("quotes").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect(),
      ctx.db.query("quoteItems").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect(),
      ctx.db.query("contracts").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect(),
      ctx.db.query("quoteDispatches").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect(),
      ctx.db.query("auditLogs").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect(),
      ctx.db.query("landingLinks").collect(),
      ctx.db.query("quoteViews").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect(),
    ]);

    return {
      project,
      notes: notes.reverse(),
      quotes: quotes.sort((a, b) => b.version - a.version),
      quoteItems,
      contracts,
      dispatches: dispatches.reverse(),
      auditLogs: auditLogs.reverse(),
      landingLinks,
      quoteViews,
    };
  },
});

export const createCustomerProject = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    address: v.string(),
    product: v.optional(v.string()),
    owner: v.optional(v.string()),
    partner: v.optional(v.string()),
    orgId: v.optional(v.number()),
    source: v.optional(v.string()),
    adCampaign: v.optional(v.string()),
    landingLinkId: v.optional(v.number()),
    note: v.optional(v.string()),
    authorName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const cleanName = args.name.trim();
    const cleanPhone = args.phone.trim();
    const cleanAddress = args.address.trim();

    const existingCustomer = await ctx.db
      .query("customers")
      .withIndex("by_phone", (q) => q.eq("phone", cleanPhone))
      .first();

    if (existingCustomer) {
      await ctx.db.patch(existingCustomer._id, {
        name: cleanName,
        address: cleanAddress.length > (existingCustomer.address?.length || 0) ? cleanAddress : existingCustomer.address,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("customers", {
        name: cleanName,
        phone: cleanPhone,
        address: cleanAddress,
        marketingAgreed: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    const allProjects = await ctx.db.query("projects").collect();
    let maxId = 3100;
    for (const p of allProjects) {
      if (p.projectId && p.projectId > maxId) maxId = p.projectId;
    }
    const nextProjectId = maxId + 1;
    const resolvedSource = String(args.source || "직접등록").trim() || "직접등록";
    const product = args.product || "창호";
    const partnerName = args.partner || "직영";
    const ownerName = args.owner || "미배정";

    await ctx.db.insert("projects", {
      projectId: nextProjectId,
      customerName: cleanName,
      customerPhone: cleanPhone,
      customerAddress: cleanAddress,
      title: `${cleanName} 고객 ${product} 공사`,
      product,
      status: "신규접수",
      label: "일반",
      source: resolvedSource,
      adChannel: resolvedSource,
      adCampaign: args.adCampaign ? String(args.adCampaign).trim() : undefined,
      landingLinkId: args.landingLinkId,
      partnerName,
      orgId: args.orgId,
      ownerName,
      note: args.note || "",
      createdAt: now,
      updatedAt: now,
    });

    if (args.note && args.note.trim()) {
      await ctx.db.insert("consultations", {
        projectId: nextProjectId,
        authorName: args.authorName || "관리자",
        type: "notes",
        content: args.note.trim(),
        isImportant: false,
        createdAt: now,
      });
    }

    await ctx.db.insert("auditLogs", {
      projectId: nextProjectId,
      userName: args.authorName || "관리자",
      action: "고객 접수",
      detail: `새 고객 등록 · ${cleanName} (${cleanPhone}) · ${product}`,
      createdAt: now,
    });

    return { projectId: nextProjectId };
  },
});

export const updateProject = mutation({
  args: {
    projectId: v.number(),
    status: v.optional(v.string()),
    label: v.optional(v.string()),
    owner: v.optional(v.string()),
    source: v.optional(v.string()),
    adCampaign: v.optional(v.string()),
    measure: v.optional(v.string()),
    build: v.optional(v.string()),
    roughQuoteUrl: v.optional(v.string()),
    finalQuoteUrl: v.optional(v.string()),
    drawing: v.optional(v.string()),
    description: v.optional(v.string()),
    userName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .first();

    if (!project) return { found: false };

    const now = new Date().toISOString();
    const patch = { updatedAt: now };
    const logDetails = [];

    if (args.status !== undefined && args.status !== project.status) {
      patch.status = args.status;
      logDetails.push(`진행구분 변경: ${project.status} → ${args.status}`);
    }
    if (args.label !== undefined && args.label !== project.label) {
      patch.label = args.label;
      logDetails.push(`라벨 변경: ${project.label} → ${args.label}`);
    }
    if (args.owner !== undefined && args.owner !== project.ownerName) {
      patch.ownerName = args.owner;
      logDetails.push(`담당자 변경: ${project.ownerName} → ${args.owner}`);
    }
    if (args.source !== undefined) {
      const nextSource = String(args.source || "").trim() || project.source;
      if (nextSource !== project.source || nextSource !== project.adChannel) {
        patch.source = nextSource;
        patch.adChannel = nextSource;
        logDetails.push(`유입채널 변경: ${project.adChannel || project.source || "미정"} → ${nextSource}`);
      }
    }
    if (args.adCampaign !== undefined) {
      const nextCamp = String(args.adCampaign || "").trim();
      if (nextCamp !== (project.adCampaign || "")) {
        patch.adCampaign = nextCamp || undefined;
        logDetails.push(`광고캠페인 변경: ${project.adCampaign || "없음"} → ${nextCamp || "없음"}`);
      }
    }
    if (args.measure !== undefined) {
      patch.measureDate = args.measure || undefined;
      logDetails.push(`실측 예정일 변경: ${args.measure || "미정"}`);
    }
    if (args.build !== undefined) {
      patch.buildDate = args.build || undefined;
      logDetails.push(`시공 예정일 변경: ${args.build || "미정"}`);
    }
    if (args.roughQuoteUrl !== undefined) {
      patch.roughQuoteUrl = args.roughQuoteUrl || undefined;
      logDetails.push(args.roughQuoteUrl ? "가견적 링크 등록·수정" : "가견적 링크 제거");
    }
    if (args.finalQuoteUrl !== undefined) {
      patch.finalQuoteUrl = args.finalQuoteUrl || undefined;
      logDetails.push(args.finalQuoteUrl ? "최종견적 링크 등록·수정" : "최종견적 링크 제거");
    }
    if (args.drawing !== undefined) {
      patch.drawingUrl = args.drawing || undefined;
      logDetails.push(args.drawing ? "내관도 링크 등록·수정" : "내관도 링크 제거");
    }
    if (args.description !== undefined) {
      patch.description = args.description;
      logDetails.push("공사 상세정보 변경");
    }

    await ctx.db.patch(project._id, patch);

    if (logDetails.length > 0) {
      await ctx.db.insert("auditLogs", {
        projectId: args.projectId,
        userName: args.userName || "관리자",
        action: "정보 변경",
        detail: logDetails.join(" · "),
        createdAt: now,
      });
    }

    return { found: true };
  },
});

export const addConsultationNote = mutation({
  args: {
    projectId: v.number(),
    authorName: v.string(),
    type: v.string(),
    content: v.string(),
    isImportant: v.boolean(),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .first();

    if (!project) return { found: false };

    const now = new Date().toISOString();
    const noteType = args.type === "feedback" ? "feedback" : "notes";

    await ctx.db.insert("consultations", {
      projectId: args.projectId,
      authorName: args.authorName,
      type: noteType,
      content: args.content.trim(),
      isImportant: args.isImportant,
      createdAt: now,
    });

    await ctx.db.insert("auditLogs", {
      projectId: args.projectId,
      userName: args.authorName,
      action: noteType === "feedback" ? "피드백 등록" : "상담 이력 등록",
      detail: args.content.trim().slice(0, 50),
      createdAt: now,
    });

    return { found: true };
  },
});

// ---------------------------------------------------------------------------
// 2. Products & Landing Links & Events
// ---------------------------------------------------------------------------

export const listProductsAndLinks = query({
  args: {},
  handler: async (ctx) => {
    const [products, landingLinks, projects, landingEvents, quotes, contracts] = await Promise.all([
      ctx.db.query("products").collect(),
      ctx.db.query("landingLinks").collect(),
      ctx.db.query("projects").collect(),
      ctx.db.query("landingEvents").collect(),
      ctx.db.query("quotes").collect(),
      ctx.db.query("contracts").collect(),
    ]);

    return {
      products: products.sort((a, b) => a.prodId - b.prodId),
      landingLinks: landingLinks.sort((a, b) => b.linkId - a.linkId),
      projects,
      landingEvents,
      quotes,
      contracts,
    };
  },
});

export const upsertProduct = mutation({
  args: {
    prodId: v.optional(v.number()),
    name: v.string(),
    code: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
    url: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    if (args.prodId) {
      const existing = await ctx.db
        .query("products")
        .withIndex("by_prodId", (q) => q.eq("prodId", args.prodId))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          name: args.name,
          code: args.code,
          category: args.category,
          description: args.description,
          url: args.url,
          active: args.active ?? existing.active,
        });
        return { prodId: existing.prodId };
      }
    }
    const all = await ctx.db.query("products").collect();
    const maxId = all.reduce((m, p) => Math.max(m, p.prodId || 0), 0);
    const prodId = args.prodId || maxId + 1;
    await ctx.db.insert("products", {
      prodId,
      name: args.name,
      code: args.code,
      category: args.category,
      description: args.description,
      url: args.url,
      active: args.active ?? true,
      createdAt: now,
    });
    return { prodId };
  },
});

export const upsertLandingLink = mutation({
  args: {
    linkId: v.optional(v.number()),
    productId: v.optional(v.number()),
    code: v.string(),
    name: v.string(),
    channel: v.string(),
    campaign: v.optional(v.string()),
    partnerName: v.optional(v.string()),
    targetUrl: v.string(),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    if (args.linkId) {
      const existing = await ctx.db
        .query("landingLinks")
        .withIndex("by_linkId", (q) => q.eq("linkId", args.linkId))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          productId: args.productId,
          code: args.code,
          name: args.name,
          channel: args.channel,
          campaign: args.campaign,
          partnerName: args.partnerName,
          targetUrl: args.targetUrl,
          active: args.active ?? existing.active,
          updatedAt: now,
        });
        return { linkId: existing.linkId };
      }
    }
    const all = await ctx.db.query("landingLinks").collect();
    const maxId = all.reduce((m, l) => Math.max(m, l.linkId || 0), 0);
    const linkId = args.linkId || maxId + 1;
    await ctx.db.insert("landingLinks", {
      linkId,
      productId: args.productId,
      code: args.code,
      name: args.name,
      channel: args.channel,
      campaign: args.campaign,
      partnerName: args.partnerName,
      targetUrl: args.targetUrl,
      clicks: 0,
      active: args.active ?? true,
      createdAt: now,
      updatedAt: now,
    });
    return { linkId };
  },
});

export const deleteLandingLink = mutation({
  args: { linkId: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("landingLinks")
      .withIndex("by_linkId", (q) => q.eq("linkId", args.linkId))
      .first();
    if (!existing) return { deleted: false };
    await ctx.db.delete(existing._id);
    return { deleted: true };
  },
});

export const recordLandingEvent = mutation({
  args: {
    eventType: v.string(),
    productName: v.optional(v.string()),
    channel: v.optional(v.string()),
    partnerName: v.optional(v.string()),
    landingLinkId: v.optional(v.number()),
    campaignName: v.optional(v.string()),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    let resolvedLink = null;
    if (args.landingLinkId) {
      resolvedLink = await ctx.db
        .query("landingLinks")
        .withIndex("by_linkId", (q) => q.eq("linkId", args.landingLinkId))
        .first();
    } else if (args.channel) {
      resolvedLink = await ctx.db
        .query("landingLinks")
        .withIndex("by_code", (q) => q.eq("code", args.channel))
        .first();
    }

    await ctx.db.insert("landingEvents", {
      ...args,
      landingLinkId: args.landingLinkId ?? resolvedLink?.linkId,
      createdAt: now,
    });
    if (resolvedLink && (args.eventType === "view" || args.eventType === "page_view")) {
      await ctx.db.patch(resolvedLink._id, {
        clicks: (resolvedLink.clicks || 0) + 1,
        updatedAt: now,
      });
    }
    return { success: true };
  },
});

// ---------------------------------------------------------------------------
// 3. Contracts & Analytics
// ---------------------------------------------------------------------------

export const listContracts = query({
  args: {},
  handler: async (ctx) => {
    const [contracts, projects] = await Promise.all([
      ctx.db.query("contracts").collect(),
      ctx.db.query("projects").collect(),
    ]);
    return { contracts, projects };
  },
});

export const upsertContract = mutation({
  args: {
    contractNo: v.string(),
    projectId: v.number(),
    customerName: v.string(),
    customerPhone: v.string(),
    status: v.string(),
    totalAmount: v.number(),
    depositAmount: v.number(),
    balanceAmount: v.number(),
    contractDate: v.optional(v.string()),
    signedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("contracts")
      .withIndex("by_contractNo", (q) => q.eq("contractNo", args.contractNo))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return { contractNo: existing.contractNo };
    }
    await ctx.db.insert("contracts", { ...args, createdAt: now, updatedAt: now });
    return { contractNo: args.contractNo };
  },
});

export const getAnalyticsData = query({
  args: {},
  handler: async (ctx) => {
    const [projects, landingEvents, landingLinks, contracts, rentalApplications, customers] = await Promise.all([
      ctx.db.query("projects").collect(),
      ctx.db.query("landingEvents").collect(),
      ctx.db.query("landingLinks").collect(),
      ctx.db.query("contracts").collect(),
      ctx.db.query("rentalApplications").collect(),
      ctx.db.query("customers").collect(),
    ]);
    return { projects, landingEvents, landingLinks, contracts, rentalApplications, customers };
  },
});

export const deleteProjects = mutation({
  args: {
    projectIds: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const idSet = new Set(args.projectIds.map((id) => Number(id)));
    if (idSet.size === 0) return { deleted: 0 };

    const tablesByIndex = [
      ["projects", "by_projectId"],
      ["quotes", "by_project"],
      ["quoteItems", "by_project"],
      ["contracts", "by_project"],
      ["consultations", "by_project"],
      ["quoteViews", "by_project"],
      ["quoteDispatches", "by_project"],
      ["auditLogs", "by_project"],
    ];

    let deletedProjects = 0;
    for (const projectId of idSet) {
      for (const [table, indexName] of tablesByIndex) {
        const rows = await ctx.db
          .query(table)
          .withIndex(indexName, (q) => q.eq("projectId", projectId))
          .collect();
        for (const r of rows) {
          await ctx.db.delete(r._id);
          if (table === "projects") deletedProjects += 1;
        }
      }
    }

    const rentals = await ctx.db.query("rentalApplications").collect();
    for (const ra of rentals) {
      if (ra.projectId !== undefined && idSet.has(Number(ra.projectId))) {
        await ctx.db.delete(ra._id);
      }
    }

    return { deleted: deletedProjects };
  },
});
