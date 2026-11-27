import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";
import { recordDeletedArchive, recordEntitySnapshot } from "./archive.js";

// ---------------------------------------------------------------------------
// 1. Customers & Projects
// ---------------------------------------------------------------------------

export const listCustomersData = query({
  args: {},
  handler: async (ctx) => {
    const [projects, quotes, landingLinks, quoteViews, quoteDispatches, organizations, consultations] = await Promise.all([
      ctx.db.query("projects").collect(),
      ctx.db.query("quotes").collect(),
      ctx.db.query("landingLinks").collect(),
      ctx.db.query("quoteViews").collect(),
      ctx.db.query("quoteDispatches").collect(),
      ctx.db.query("organizations").collect(),
      ctx.db.query("consultations").collect(),
    ]);

    const sortedConsultations = consultations
      .slice()
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    const quoteInquiries = sortedConsultations
      .filter((c) => typeof c.content === "string" && c.content.startsWith("[모바일 견적서 상담 요청]"));

    return {
      projects: projects.sort((a, b) => b.projectId - a.projectId),
      quotes: quotes.filter((q) => q.status === "published"),
      landingLinks,
      quoteViews,
      quoteDispatches: quoteDispatches.filter((d) => d.status === "sent"),
      organizations,
      quoteInquiries,
      consultations: sortedConsultations,
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

    await recordEntitySnapshot(ctx, {
      entityType: "project",
      entityKey: `project:${nextProjectId}`,
      projectId: nextProjectId,
      action: "create",
      title: `${cleanName} 고객 (${product})`,
      snapshot: {
        projectId: nextProjectId,
        customerName: cleanName,
        customerPhone: cleanPhone,
        customerAddress: cleanAddress,
        product,
        status: "신규접수",
        source: resolvedSource,
        adCampaign: args.adCampaign ? String(args.adCampaign).trim() : undefined,
        partnerName,
        orgId: args.orgId,
        ownerName,
        note: args.note || "",
        createdAt: now,
      },
      savedBy: args.authorName || "관리자",
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
      if (
        args.roughQuoteUrl &&
        args.status === undefined &&
        ["신규접수", "상담중", "가견적요청", "견적안내"].includes(project.status)
      ) {
        patch.status = "가견적 생성함";
        logDetails.push(`진행구분 자동변경: ${project.status} → 가견적 생성함`);
      }
    }
    if (args.finalQuoteUrl !== undefined) {
      patch.finalQuoteUrl = args.finalQuoteUrl || undefined;
      logDetails.push(args.finalQuoteUrl ? "최종견적 링크 등록·수정" : "최종견적 링크 제거");
      if (
        args.finalQuoteUrl &&
        args.status === undefined &&
        ["신규접수", "상담중", "가견적요청", "가견적 생성함", "견적안내", "실측예정", "실측완료", "최종견적"].includes(project.status)
      ) {
        patch.status = "최종견적 생성함";
        logDetails.push(`진행구분 자동변경: ${project.status} → 최종견적 생성함`);
      }
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
      await recordEntitySnapshot(ctx, {
        entityType: "project",
        entityKey: `project:${args.projectId}`,
        projectId: args.projectId,
        action: "update",
        title: `${project.customerName} 고객 (No.${args.projectId})`,
        snapshot: { ...project, ...patch },
        savedBy: args.userName || "관리자",
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

    await ctx.db.patch(project._id, { updatedAt: now });

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
        if (existing.channel !== args.channel || existing.name !== args.name || existing.code !== args.code) {
          const allProjects = await ctx.db.query("projects").collect();
          for (const pr of allProjects) {
            if (pr.landingLinkId === existing.linkId || pr.source === existing.code) {
              const patchProj = {};
              if (!pr.adChannel || pr.adChannel === existing.channel || pr.adChannel === existing.code) {
                patchProj.adChannel = args.channel;
              }
              if (!pr.adCampaign || pr.adCampaign === existing.name) {
                patchProj.adCampaign = args.name;
              }
              if (pr.source === existing.code && args.code) {
                patchProj.source = args.code;
              }
              if (Object.keys(patchProj).length > 0) {
                patchProj.updatedAt = now;
                await ctx.db.patch(pr._id, patchProj);
              }
            }
          }
        }
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
  args: {
    linkId: v.number(),
    userName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("landingLinks")
      .withIndex("by_linkId", (q) => q.eq("linkId", args.linkId))
      .first();
    if (!existing) return { deleted: false };
    await recordDeletedArchive(ctx, {
      archiveType: "landing_link",
      targetKey: `link:${existing.linkId}`,
      title: `광고링크 · [${existing.channel}] ${existing.name} (${existing.code})`,
      summary: `클릭수 ${existing.clicks || 0}회 · 파트너 ${existing.partnerName || "직영"}`,
      payload: { landingLink: existing },
      deletedBy: args.userName || "관리자",
    });
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
    device: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const cleanChannelArg = args.channel ? String(args.channel).trim() : undefined;
    let resolvedLink = null;
    if (args.landingLinkId) {
      resolvedLink = await ctx.db
        .query("landingLinks")
        .withIndex("by_linkId", (q) => q.eq("linkId", args.landingLinkId))
        .first();
    } else if (cleanChannelArg) {
      resolvedLink = await ctx.db
        .query("landingLinks")
        .withIndex("by_code", (q) => q.eq("code", cleanChannelArg))
        .first();
    }

    const resolvedChannelName = resolvedLink?.channel || args.utmSource || cleanChannelArg;
    const resolvedCampaignName = args.campaignName || args.utmCampaign || resolvedLink?.name || resolvedLink?.campaign;
    const resolvedPartnerName =
      args.partnerName && args.partnerName !== "직영"
        ? args.partnerName
        : (resolvedLink?.partnerName || args.partnerName || "직영");

    await ctx.db.insert("landingEvents", {
      ...args,
      channel: resolvedChannelName,
      campaignName: resolvedCampaignName,
      partnerName: resolvedPartnerName,
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

    let result;
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      result = { contractNo: existing.contractNo };
    } else {
      await ctx.db.insert("contracts", { ...args, createdAt: now, updatedAt: now });
      result = { contractNo: args.contractNo };
    }

    await recordEntitySnapshot(ctx, {
      entityType: "contract",
      entityKey: `contract:${args.contractNo}`,
      projectId: args.projectId,
      action: existing ? "update" : "create",
      title: `${args.customerName} 고객 계약 (${args.contractNo})`,
      snapshot: { ...args, updatedAt: now },
      savedBy: "관리자",
      createdAt: now,
    });

    // 계약관리에 계약/렌탈 건이 등록되면 고객 진행구분(status)을 자동으로 '계약진행'으로 전환
    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .first();
    if (project && !["계약진행", "계약완료", "시공완료"].includes(project.status)) {
      const prevStatus = project.status;
      await ctx.db.patch(project._id, { status: "계약진행", updatedAt: now });
      await ctx.db.insert("auditLogs", {
        projectId: args.projectId,
        userName: "시스템",
        action: "계약 자동 연동",
        detail: `계약(${args.contractNo}) 등록 · 진행구분 변경: ${prevStatus} → 계약진행`,
        createdAt: now,
      });
    }

    return result;
  },
});

export const deleteContract = mutation({
  args: {
    contractNo: v.string(),
    userName: v.optional(v.string()),
    contractMetaJson: v.optional(v.string()),
    paymentOrdersJson: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("contracts")
      .withIndex("by_contractNo", (q) => q.eq("contractNo", args.contractNo))
      .first();
    if (!existing) return { deleted: false };

    let contractMetaMap = {};
    let paymentOrders = [];
    if (args.contractMetaJson) {
      try {
        const parsed = JSON.parse(args.contractMetaJson);
        if (parsed && typeof parsed === "object") {
          contractMetaMap[args.contractNo] = parsed;
        }
      } catch {}
    }
    if (args.paymentOrdersJson) {
      try {
        const parsed = JSON.parse(args.paymentOrdersJson);
        if (Array.isArray(parsed)) paymentOrders = parsed;
      } catch {}
    }
    if (!Object.keys(contractMetaMap).length && !paymentOrders.length) {
      const ledgerDoc = await ctx.db
        .query("appSettings")
        .withIndex("by_key", (q) => q.eq("key", "crm_payment_ledger_v1"))
        .first();
      if (ledgerDoc?.value) {
        try {
          const ledger = JSON.parse(ledgerDoc.value);
          if (ledger?.contractMeta?.[args.contractNo]) {
            contractMetaMap[args.contractNo] = ledger.contractMeta[args.contractNo];
          }
          if (Array.isArray(ledger?.paymentOrders)) {
            paymentOrders = ledger.paymentOrders.filter(
              (o) => o && o.contractNo === args.contractNo
            );
          }
        } catch {}
      }
    }

    await recordDeletedArchive(ctx, {
      archiveType: "contract",
      targetKey: `contract:${existing.contractNo}`,
      projectId: existing.projectId,
      title: `${existing.customerName} 고객 계약 (${existing.contractNo})`,
      summary: `총 계약금 ${Number(existing.totalAmount || 0).toLocaleString()}원 · 상태 ${existing.status}`,
      payload: {
        contract: existing,
        contractMeta: contractMetaMap,
        paymentOrders,
      },
      deletedBy: args.userName || "관리자",
    });

    await ctx.db.delete(existing._id);
    return { deleted: true };
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
    userName: v.optional(v.string()),
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

    const rentals = await ctx.db.query("rentalApplications").collect();
    const ledgerDoc = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "crm_payment_ledger_v1"))
      .first();
    let parsedLedger = null;
    let ledgerChanged = false;
    if (ledgerDoc?.value) {
      try {
        parsedLedger = JSON.parse(ledgerDoc.value);
      } catch {}
    }

    let deletedProjects = 0;
    const now = new Date().toISOString();

    for (const projectId of idSet) {
      const bucket = {
        projects: [],
        quotes: [],
        quoteItems: [],
        contracts: [],
        consultations: [],
        quoteViews: [],
        quoteDispatches: [],
        auditLogs: [],
        rentalApplications: [],
        contractMeta: {},
        paymentOrders: [],
      };

      for (const [table, indexName] of tablesByIndex) {
        const rows = await ctx.db
          .query(table)
          .withIndex(indexName, (q) => q.eq("projectId", projectId))
          .collect();
        bucket[table] = rows;
      }

      const matchedRentals = rentals.filter(
        (ra) => ra.projectId !== undefined && Number(ra.projectId) === projectId
      );
      bucket.rentalApplications = matchedRentals;

      if (parsedLedger && typeof parsedLedger === "object") {
        const contractNos = new Set(bucket.contracts.map((c) => c.contractNo));
        if (parsedLedger.contractMeta && typeof parsedLedger.contractMeta === "object") {
          for (const cNo of contractNos) {
            if (parsedLedger.contractMeta[cNo]) {
              bucket.contractMeta[cNo] = parsedLedger.contractMeta[cNo];
              delete parsedLedger.contractMeta[cNo];
              ledgerChanged = true;
            }
          }
        }
        if (Array.isArray(parsedLedger.paymentOrders)) {
          const relOrders = parsedLedger.paymentOrders.filter(
            (o) => o && (Number(o.projectId) === projectId || contractNos.has(o.contractNo))
          );
          if (relOrders.length > 0) {
            bucket.paymentOrders = relOrders;
          }
        }
      }

      if (bucket.projects.length > 0 || bucket.quotes.length > 0 || bucket.contracts.length > 0) {
        const mainProj = bucket.projects[0];
        await recordDeletedArchive(ctx, {
          archiveType: "project",
          targetKey: `project:${projectId}`,
          projectId,
          title: `${mainProj?.customerName || "고객"} (No.${projectId} · ${mainProj?.product || "창호"})`,
          summary: `견적 ${bucket.quotes.length}건(품목 ${bucket.quoteItems.length}건) · 계약 ${bucket.contracts.length}건 · 상담 ${bucket.consultations.length}건 포함 전체 백업`,
          payload: bucket,
          deletedBy: args.userName || "관리자",
          deletedAt: now,
        });
      }

      for (const [table] of tablesByIndex) {
        for (const r of bucket[table]) {
          await ctx.db.delete(r._id);
          if (table === "projects") deletedProjects += 1;
        }
      }
      for (const ra of matchedRentals) {
        await ctx.db.delete(ra._id);
      }
    }

    if (ledgerChanged && ledgerDoc && parsedLedger) {
      await ctx.db.patch(ledgerDoc._id, {
        value: JSON.stringify(parsedLedger),
        updatedAt: now,
      });
    }

    return { deleted: deletedProjects };
  },
});
