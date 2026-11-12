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
