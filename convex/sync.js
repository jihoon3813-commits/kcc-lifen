import { mutation } from "./_generated/server.js";
import { v } from "convex/values";

// 1. 일괄 프로젝트 동기화 뮤테이션
export const batchSyncProjects = mutation({
  args: {
    projects: v.array(
      v.object({
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
        createdAt: v.optional(v.string()),
        updatedAt: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const p of args.projects) {
      const existing = await ctx.db
        .query("projects")
        .withIndex("by_projectId", (q) => q.eq("projectId", p.projectId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, p);
        updated++;
      } else {
        await ctx.db.insert("projects", p);
        inserted++;
      }
    }

    return { inserted, updated };
  },
});

// 2. 일괄 렌탈 신청서 동기화 뮤테이션
export const batchSyncRentals = mutation({
  args: {
    rentals: v.array(
      v.object({
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
        createdAt: v.optional(v.string()),
        updatedAt: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const r of args.rentals) {
      const existing = await ctx.db
        .query("rentalApplications")
        .withIndex("by_appNo", (q) => q.eq("appNo", r.appNo))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, r);
        updated++;
      } else {
        await ctx.db.insert("rentalApplications", r);
        inserted++;
      }
    }

    return { inserted, updated };
  },
});

// 3. 일괄 견적서 동기화 뮤테이션
export const batchSyncQuotes = mutation({
  args: {
    quotes: v.array(
      v.object({
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
        createdAt: v.optional(v.string()),
        updatedAt: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;
    for (const q of args.quotes) {
      const existing = await ctx.db
        .query("quotes")
        .withIndex("by_project", (query) => query.eq("projectId", q.projectId))
        .filter((query) => query.eq(query.field("version"), q.version))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, q);
        updated++;
      } else {
        await ctx.db.insert("quotes", q);
        inserted++;
      }
    }
    return { inserted, updated };
  },
});

// 4. 일괄 전자계약 동기화 뮤테이션
export const batchSyncContracts = mutation({
  args: {
    contracts: v.array(
      v.object({
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
        createdAt: v.optional(v.string()),
        updatedAt: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;
    for (const c of args.contracts) {
      const existing = await ctx.db
        .query("contracts")
        .withIndex("by_contractNo", (q) => q.eq("contractNo", c.contractNo))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, c);
        updated++;
      } else {
        await ctx.db.insert("contracts", c);
        inserted++;
      }
    }
    return { inserted, updated };
  },
});

// 5. 일괄 양식(개인정보 동의서 등) 동기화 뮤테이션
export const batchSyncConsentForms = mutation({
  args: {
    forms: v.array(
      v.object({
        formId: v.string(),
        name: v.string(),
        type: v.string(),
        pdfPath: v.optional(v.string()),
        fileName: v.optional(v.string()),
        fieldsConfigJson: v.optional(v.string()),
        version: v.number(),
        enabled: v.boolean(),
        createdAt: v.optional(v.string()),
        updatedAt: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;
    for (const f of args.forms) {
      const existing = await ctx.db
        .query("consentForms")
        .withIndex("by_formId", (q) => q.eq("formId", f.formId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, f);
        updated++;
      } else {
        await ctx.db.insert("consentForms", f);
        inserted++;
      }
    }
    return { inserted, updated };
  },
});

// 6. 일괄 시스템 설정 (라벨, 단계, 상태) 동기화 뮤테이션
export const batchSyncSystemSettings = mutation({
  args: {
    labels: v.array(v.object({ name: v.string(), color: v.string(), sortOrder: v.number() })),
    stages: v.array(v.object({ name: v.string(), sortOrder: v.number() })),
    statuses: v.array(v.object({ name: v.string(), color: v.string(), sortOrder: v.number() })),
  },
  handler: async (ctx, args) => {
    // 라벨 동기화
    for (const l of args.labels) {
      const existing = await ctx.db.query("systemLabels").withIndex("by_name", (q) => q.eq("name", l.name)).first();
      if (existing) await ctx.db.patch(existing._id, l);
      else await ctx.db.insert("systemLabels", l);
    }
    // 단계 동기화
    for (const s of args.stages) {
      const existing = await ctx.db.query("systemStages").withIndex("by_name", (q) => q.eq("name", s.name)).first();
      if (existing) await ctx.db.patch(existing._id, s);
      else await ctx.db.insert("systemStages", s);
    }
    // 상태 동기화
    for (const st of args.statuses) {
      const existing = await ctx.db.query("systemContractStatuses").withIndex("by_name", (q) => q.eq("name", st.name)).first();
      if (existing) await ctx.db.patch(existing._id, st);
      else await ctx.db.insert("systemContractStatuses", st);
    }
    return { success: true };
  },
});

// 7. 일괄 사용자/계정 동기화 뮤테이션
export const batchSyncUsers = mutation({
  args: {
    users: v.array(
      v.object({
        username: v.string(),
        passwordHash: v.string(),
        name: v.string(),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
        role: v.string(),
        allowedMenus: v.optional(v.string()),
        active: v.boolean(),
        createdAt: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let count = 0;
    for (const u of args.users) {
      const existing = await ctx.db.query("users").withIndex("by_username", (q) => q.eq("username", u.username)).first();
      if (existing) await ctx.db.patch(existing._id, u);
      else await ctx.db.insert("users", u);
      count++;
    }
    return { count };
  },
});
