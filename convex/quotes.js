import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";

// 프로젝트별 견적서 목록 조회
export const listByProject = query({
  args: { projectId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quotes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

// 공개 견적서 토큰으로 조회 (고객 모바일 견적 뷰어용)
export const getPublicByToken = query({
  args: { accessToken: v.string() },
  handler: async (ctx, args) => {
    const quote = await ctx.db
      .query("quotes")
      .withIndex("by_accessToken", (q) => q.eq("accessToken", args.accessToken))
      .first();

    if (!quote) return null;

    const items = await ctx.db
      .query("quoteItems")
      .withIndex("by_project", (q) => q.eq("projectId", quote.projectId))
      .filter((q) => q.eq(q.field("quoteVersion"), quote.version))
      .collect();

    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", quote.projectId))
      .first();

    return {
      quote,
      items: items.sort((a, b) => a.sortOrder - b.sortOrder),
      project,
    };
  },
});

function normalizeCustomerName(name) {
  return String(name || "").trim().replace(/\s+/g, "");
}

function normalizeCustomerPhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

async function buildPublicQuoteBundle(ctx, quote, project) {
  const [items, organizations, users] = await Promise.all([
    ctx.db
      .query("quoteItems")
      .withIndex("by_project", (q) => q.eq("projectId", quote.projectId))
      .filter((q) => q.eq(q.field("quoteVersion"), quote.version))
      .collect(),
    ctx.db.query("organizations").collect(),
    ctx.db.query("users").collect(),
  ]);

  const manager = users.find((u) => u.name === project.ownerName);
  const org = organizations.find((o) => Number(o.orgId) === Number(project.orgId));

  // 동일 고객의 발행 견적서 목록 조회 (다중 견적 전환용)
  const targetName = normalizeCustomerName(project.customerName);
  const targetPhone = normalizeCustomerPhone(project.customerPhone);
  const allProjects = await ctx.db.query("projects").collect();
  const customerProjects = allProjects.filter(
    (p) =>
      normalizeCustomerName(p.customerName) === targetName &&
      normalizeCustomerPhone(p.customerPhone) === targetPhone
  );

  const availableQuotes = [];
  for (const cp of customerProjects) {
    const pQuotes = await ctx.db
      .query("quotes")
      .withIndex("by_project", (q) => q.eq("projectId", cp.projectId))
      .collect();
    for (const pq of pQuotes) {
      if (pq.status !== "published" || !pq.accessToken) continue;
      availableQuotes.push({
        access_token: pq.accessToken,
        title: pq.title,
        quote_type: pq.quoteType || "가견적",
        product: cp.product || "창호",
        total_price: pq.totalPrice,
        published_at: pq.publishedAt || pq.createdAt || "",
        version: pq.version || 0,
      });
    }
  }
  availableQuotes.sort((a, b) =>
    String(b.published_at).localeCompare(String(a.published_at)) || b.version - a.version
  );

  return {
    quote,
    items: items.sort((a, b) => a.sortOrder - b.sortOrder),
    project,
    managerPhone: manager?.phone || "",
    orgPhone: org?.phone || "",
    availableQuotes: availableQuotes.map(({ version, ...rest }) => rest),
  };
}

// 공개 견적서 상세 번들 조회 (토큰 기반, 발행 건만 허용)
export const getPublicBundleByToken = query({
  args: { accessToken: v.string() },
  handler: async (ctx, args) => {
    const quote = await ctx.db
      .query("quotes")
      .withIndex("by_accessToken", (q) => q.eq("accessToken", args.accessToken))
      .first();

    if (!quote || quote.status !== "published") return null;

    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", quote.projectId))
      .first();

    if (!project) return null;
    return await buildPublicQuoteBundle(ctx, quote, project);
  },
});

// 고객 이름 + 휴대폰 번호로 발행된 견적서 조회 (토큰 없이 단독 로그인용)
export const findPublishedQuotesByCustomer = query({
  args: {
    customerName: v.string(),
    customerPhone: v.string(),
  },
  handler: async (ctx, args) => {
    const targetName = normalizeCustomerName(args.customerName);
    const targetPhone = normalizeCustomerPhone(args.customerPhone);
    if (!targetName || !targetPhone) return null;

    const allProjects = await ctx.db.query("projects").collect();
    const matchedProjects = allProjects.filter(
      (p) =>
        normalizeCustomerName(p.customerName) === targetName &&
        normalizeCustomerPhone(p.customerPhone) === targetPhone
    );
    if (matchedProjects.length === 0) return null;

    const candidates = [];
    for (const cp of matchedProjects) {
      const pQuotes = await ctx.db
        .query("quotes")
        .withIndex("by_project", (q) => q.eq("projectId", cp.projectId))
        .collect();
      for (const pq of pQuotes) {
        if (pq.status === "published" && pq.accessToken) {
          candidates.push({ quote: pq, project: cp });
        }
      }
    }
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      const pa = String(a.quote.publishedAt || a.quote.createdAt || "");
      const pb = String(b.quote.publishedAt || b.quote.createdAt || "");
      return pb.localeCompare(pa) || (b.quote.version || 0) - (a.quote.version || 0);
    });

    const latest = candidates[0];
    return await buildPublicQuoteBundle(ctx, latest.quote, latest.project);
  },
});

// 공개 견적서 열람 이력 기록
export const recordPublicQuoteView = mutation({
  args: {
    projectId: v.number(),
    quoteVersion: v.number(),
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.insert("quoteViews", {
      projectId: args.projectId,
      quoteId: args.quoteVersion,
      accessToken: args.accessToken,
      viewedAt: now,
    });
    return { ok: true, viewedAt: now };
  },
});

// 모바일 견적서 고객 상담 요청 접수
export const recordPublicConsultRequest = mutation({
  args: {
    projectId: v.number(),
    customerName: v.string(),
    customerPhone: v.string(),
    product: v.optional(v.string()),
    address: v.optional(v.string()),
    planSummary: v.optional(v.string()),
    topics: v.array(v.string()),
    preferredTime: v.string(),
    memo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const summaryParts = [
      "[모바일 견적서 상담 요청]",
      args.planSummary ? `선택 조건: ${args.planSummary}` : null,
      `문의 항목: ${args.topics.length ? args.topics.join(", ") : "견적 전반 상담"}`,
      `희망 연락시간: ${args.preferredTime}`,
      args.memo ? `고객 메모: ${args.memo}` : null,
    ].filter(Boolean);

    await ctx.db.insert("consultations", {
      projectId: args.projectId,
      authorName: `${args.customerName}(고객)`,
      type: "notes",
      content: summaryParts.join(" · "),
      isImportant: true,
      createdAt: now,
    });

    await ctx.db.insert("auditLogs", {
      projectId: args.projectId,
      userName: `${args.customerName}(고객)`,
      action: "모바일 상담 접수",
      detail: `${args.topics.length ? args.topics.join(", ") : "견적 상담"} / 희망시간: ${args.preferredTime}`,
      createdAt: now,
    });

    await ctx.db.insert("customerConsultRequests", {
      name: args.customerName,
      phone: args.customerPhone,
      address: args.address || "",
      product: args.product || "창호",
      status: "신규접수",
      source: "모바일견적서",
      createdAt: now,
    });

    return { ok: true, createdAt: now };
  },
});

// 견적서 등록 또는 업데이트
export const upsertQuote = mutation({
  args: {
    projectId: v.number(),
    version: v.number(),
    title: v.string(),
    quoteType: v.string(),
    status: v.string(),
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("quotes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("version"), args.version))
      .first();

    const now = new Date().toISOString();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("quotes", {
        ...args,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// 견적서 생성/발행 (품목 + 프로젝트 상태/링크 + 감사로그 일괄 반영)
export const createProjectQuote = mutation({
  args: {
    projectId: v.number(),
    title: v.optional(v.string()),
    quoteType: v.string(),
    status: v.string(),
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
    marginAmount: v.number(),
    metaJson: v.optional(v.string()),
    memo: v.optional(v.string()),
    accessToken: v.string(),
    isPublish: v.boolean(),
    userName: v.optional(v.string()),
    items: v.array(
      v.object({
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
      })
    ),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .first();

    if (!project) {
      return { found: false };
    }

    const existingQuotes = await ctx.db
      .query("quotes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const maxVer = existingQuotes.reduce((max, q) => Math.max(max, Number(q.version) || 0), 0);
    const nextVer = maxVer + 1;
    const now = new Date().toISOString();
    const publishedAt = args.isPublish ? now : undefined;
    const quoteTitle = args.title && args.title.trim()
      ? args.title.trim()
      : `${project.title || project.customerName || "고객"} 견적서 (v${nextVer})`;

    const quoteDocId = await ctx.db.insert("quotes", {
      projectId: args.projectId,
      version: nextVer,
      title: quoteTitle,
      quoteType: args.quoteType,
      status: args.status,
      totalCost: args.totalCost,
      supplyCost: args.supplyCost,
      marginRate: args.marginRate,
      materialSubtotal: args.materialSubtotal,
      extraSubtotal: args.extraSubtotal,
      salePrice: args.salePrice,
      vat: args.vat,
      originalPrice: args.originalPrice,
      totalPrice: args.totalPrice,
      discountAmount: args.discountAmount,
      metaJson: args.metaJson,
      memo: args.memo,
      accessToken: args.accessToken,
      publishedAt,
      createdAt: now,
      updatedAt: now,
    });

    for (const item of args.items) {
      await ctx.db.insert("quoteItems", {
        projectId: args.projectId,
        quoteVersion: nextVer,
        sortOrder: item.sortOrder,
        name: item.name,
        spec: item.spec,
        category: item.category,
        detailJson: item.detailJson,
        quantity: item.quantity,
        marginRate: item.marginRate,
        costUnitPrice: item.costUnitPrice,
        costTotal: item.costTotal,
        saleUnitPrice: item.saleUnitPrice,
        saleTotal: item.saleTotal,
      });
    }

    const publicUrl = `/quote.html?token=${args.accessToken}`;

    if (args.isPublish) {
      let nextStatus = project.status;
      if (
        args.quoteType === "최종견적" &&
        ["신규접수", "상담중", "가견적요청", "견적안내", "실측예정", "실측완료"].includes(project.status)
      ) {
        nextStatus = "최종견적";
      } else if (["신규접수", "가견적요청"].includes(project.status)) {
        nextStatus = "견적안내";
      }

      const patch = {
        status: nextStatus,
        updatedAt: now,
      };
      if (args.quoteType === "최종견적") {
        patch.finalQuoteUrl = publicUrl;
      } else {
        patch.roughQuoteUrl = publicUrl;
      }
      await ctx.db.patch(project._id, patch);
    }

    await ctx.db.insert("auditLogs", {
      projectId: args.projectId,
      userName: args.userName || "관리자",
      action: args.isPublish ? `${args.quoteType} 발행` : "가견적 임시저장",
      detail: `견적 v${nextVer} (${quoteTitle}): 공급원가 ${args.supplyCost.toLocaleString()}원, 절삭총액 ${args.originalPrice.toLocaleString()}원, 일시불할인 ${args.discountAmount.toLocaleString()}원, 최종합계 ${args.totalPrice.toLocaleString()}원 (마진 ${args.marginAmount.toLocaleString()}원)`,
      createdAt: now,
    });

    return {
      found: true,
      quoteDocId: String(quoteDocId),
      version: nextVer,
      quoteType: args.quoteType,
      title: quoteTitle,
      accessToken: args.accessToken,
      publicUrl,
      orgId: project.orgId,
      partnerName: project.partnerName,
    };
  },
});

// 프로젝트별 발행 견적서 미리보기/발송용 조회
export const getPreviewByProject = query({
  args: { projectId: v.number() },
  handler: async (ctx, args) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .first();

    if (!project) return null;

    const [quotes, quoteItems, dispatches, views, organizations, users] = await Promise.all([
      ctx.db.query("quotes").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect(),
      ctx.db.query("quoteItems").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect(),
      ctx.db.query("quoteDispatches").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect(),
      ctx.db.query("quoteViews").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect(),
      ctx.db.query("organizations").collect(),
      ctx.db.query("users").collect(),
    ]);

    const publishedQuotes = quotes
      .filter((q) => q.status === "published")
      .sort((a, b) => b.version - a.version);

    const manager = users.find((u) => u.name === project.ownerName);
    const org = organizations.find((o) => Number(o.orgId) === Number(project.orgId));

    return {
      project,
      quotes: publishedQuotes,
      quoteItems,
      dispatches: dispatches.reverse().slice(0, 20),
      views,
      organizations,
      managerPhone: manager?.phone || "",
      orgPhone: org?.phone || "",
    };
  },
});

// 견적서 발송 이력 저장
export const recordQuoteDispatch = mutation({
  args: {
    projectId: v.number(),
    quoteVersion: v.number(),
    channel: v.string(),
    recipientName: v.string(),
    recipientPhone: v.string(),
    message: v.string(),
    quoteUrl: v.string(),
    provider: v.string(),
    status: v.string(),
    sentBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.insert("quoteDispatches", {
      projectId: args.projectId,
      quoteId: args.quoteVersion,
      channel: args.channel,
      recipientName: args.recipientName,
      recipientPhone: args.recipientPhone,
      message: args.message,
      quoteUrl: args.quoteUrl,
      provider: args.provider,
      status: args.status,
      sentBy: args.sentBy,
      createdAt: now,
    });

    await ctx.db.insert("auditLogs", {
      projectId: args.projectId,
      userName: args.sentBy,
      action: `견적서 ${args.channel === "kakao" ? "카카오톡" : "문자"} 발송`,
      detail: `${args.recipientName} (${args.recipientPhone}) · ${args.provider} · ${args.status === "sent" ? "발송완료" : "발송실패"}`,
      createdAt: now,
    });

    return { ok: true, createdAt: now };
  },
});
