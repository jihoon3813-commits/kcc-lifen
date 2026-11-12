import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";

// 렌탈 신청서 목록 조회
export const list = query({
  args: {
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let apps = await ctx.db.query("rentalApplications").collect();

    if (args.status && args.status !== "all") {
      apps = apps.filter((a) => a.status === args.status);
    }

    if (args.search) {
      const q = args.search.toLowerCase();
      apps = apps.filter(
        (a) =>
          a.appNo.toLowerCase().includes(q) ||
          a.customerName.toLowerCase().includes(q) ||
          a.customerPhone.includes(q)
      );
    }

    return apps.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  },
});

// 단일 렌탈 신청서 조회
export const getByAppNo = query({
  args: { appNo: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rentalApplications")
      .withIndex("by_appNo", (q) => q.eq("appNo", args.appNo))
      .first();
  },
});

// 렌탈 신청서 등록 또는 업데이트
export const upsertApplication = mutation({
  args: {
    appNo: v.string(),
    projectId: v.optional(v.number()),
    quoteId: v.optional(v.number()),
    customerName: v.string(),
    customerPhone: v.string(),
    customerBirth: v.optional(v.string()),
    installationAddress: v.string(),
    productSummary: v.optional(v.string()),
    monthlyFee: v.number(),
    rentalPeriod: v.number(),
    totalRentalFee: v.number(),
    status: v.string(),
    score: v.optional(v.number()),
    grade: v.optional(v.string()),
    underwritingMemo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("rentalApplications")
      .withIndex("by_appNo", (q) => q.eq("appNo", args.appNo))
      .first();

    const now = new Date().toISOString();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("rentalApplications", {
        ...args,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// 렌탈 심사 상태 및 메모 변경
export const updateReview = mutation({
  args: {
    appNo: v.string(),
    status: v.string(),
    underwritingMemo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db
      .query("rentalApplications")
      .withIndex("by_appNo", (q) => q.eq("appNo", args.appNo))
      .first();

    if (!app) {
      throw new Error(`Application ${args.appNo} not found`);
    }

    const patchData = {
      status: args.status,
      updatedAt: new Date().toISOString(),
    };
    if (args.underwritingMemo !== undefined) {
      patchData.underwritingMemo = args.underwritingMemo;
    }

    await ctx.db.patch(app._id, patchData);
    return { success: true };
  },
});
