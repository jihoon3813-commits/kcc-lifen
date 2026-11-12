import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";

// 프로젝트 전체 조회 (필터링 및 정렬)
export const list = query({
  args: {
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let projects = await ctx.db.query("projects").collect();

    if (args.status && args.status !== "all") {
      projects = projects.filter((p) => p.status === args.status);
    }

    if (args.search) {
      const q = args.search.toLowerCase();
      projects = projects.filter(
        (p) =>
          p.customerName.toLowerCase().includes(q) ||
          p.customerPhone.includes(q) ||
          (p.title && p.title.toLowerCase().includes(q)) ||
          String(p.projectId).includes(q)
      );
    }

    return projects.sort((a, b) => b.projectId - a.projectId);
  },
});

// 단일 프로젝트 조회
export const getById = query({
  args: { projectId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .first();
  },
});

// 프로젝트 등록 또는 업데이트 (Upsert)
export const upsertProject = mutation({
  args: {
    projectId: v.number(),
    customerName: v.string(),
    customerPhone: v.string(),
    customerAddress: v.string(),
    title: v.optional(v.string()),
    product: v.string(),
    status: v.string(),
    label: v.string(),
    source: v.string(),
    partnerName: v.string(),
    ownerName: v.string(),
    measureDate: v.optional(v.string()),
    buildDate: v.optional(v.string()),
    description: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .first();

    const now = new Date().toISOString();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("projects", {
        ...args,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// 프로젝트 상태 변경
export const updateStatus = mutation({
  args: {
    projectId: v.number(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .first();

    if (!project) {
      throw new Error(`Project ${args.projectId} not found`);
    }

    await ctx.db.patch(project._id, {
      status: args.status,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});
