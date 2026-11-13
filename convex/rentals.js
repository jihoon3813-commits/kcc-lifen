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
    contractReference: v.optional(v.string()),
    checkId: v.optional(v.boolean()),
    checkSignature: v.optional(v.boolean()),
    checkConsent: v.optional(v.boolean()),
    consentsJson: v.optional(v.string()),
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
    contractReference: v.optional(v.string()),
    checkId: v.optional(v.boolean()),
    checkSignature: v.optional(v.boolean()),
    checkConsent: v.optional(v.boolean()),
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
    if (args.contractReference !== undefined) {
      patchData.contractReference = args.contractReference;
    }
    if (args.checkId !== undefined) {
      patchData.checkId = args.checkId;
    }
    if (args.checkSignature !== undefined) {
      patchData.checkSignature = args.checkSignature;
    }
    if (args.checkConsent !== undefined) {
      patchData.checkConsent = args.checkConsent;
    }

    await ctx.db.patch(app._id, patchData);
    return { success: true };
  },
});

// 파일 업로드 URL 발급 (신분증 사진 / 전자서명용)
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// 렌탈 서류(신분증 사진 / 전자서명) 저장
export const saveDocument = mutation({
  args: {
    appNo: v.string(),
    kind: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    byteSize: v.number(),
    sha256Digest: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("rentalDocuments")
      .withIndex("by_appNo_and_kind", (q) =>
        q.eq("appNo", args.appNo).eq("kind", args.kind)
      )
      .collect();

    let maxVer = 0;
    for (const doc of existing) {
      if ((doc.versionNo || 0) > maxVer) maxVer = doc.versionNo || 0;
      if (doc.isActive) {
        await ctx.db.patch(doc._id, { isActive: false });
      }
    }

    const now = new Date().toISOString();
    return await ctx.db.insert("rentalDocuments", {
      appNo: args.appNo,
      kind: args.kind,
      versionNo: maxVer + 1,
      storageId: args.storageId,
      mimeType: args.mimeType,
      byteSize: args.byteSize,
      sha256Digest: args.sha256Digest,
      isActive: true,
      createdAt: now,
    });
  },
});

// 특정 신청서의 첨부 서류 목록 조회 (서명 URL 포함)
export const getDocumentsByAppNo = query({
  args: { appNo: v.string() },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("rentalDocuments")
      .withIndex("by_appNo", (q) => q.eq("appNo", args.appNo))
      .collect();

    const withUrls = await Promise.all(
      docs.map(async (d) => ({
        ...d,
        url: d.deletedAt ? null : await ctx.storage.getUrl(d.storageId),
      }))
    );

    return withUrls.sort((a, b) => (b.versionNo || 0) - (a.versionNo || 0));
  },
});

// 전체 활성 첨부 서류 요약 조회 (목록·양식 미리보기 연동용)
export const listActiveDocuments = query({
  args: { kind: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const docs = await ctx.db.query("rentalDocuments").collect();
    const active = docs.filter(
      (d) => d.isActive && !d.deletedAt && (!args.kind || d.kind === args.kind)
    );
    return await Promise.all(
      active.map(async (d) => ({
        appNo: d.appNo,
        kind: d.kind,
        versionNo: d.versionNo,
        mimeType: d.mimeType,
        byteSize: d.byteSize,
        url: await ctx.storage.getUrl(d.storageId),
      }))
    );
  },
});
