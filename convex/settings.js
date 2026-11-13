import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";

export const getSetting = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (!doc) return null;
    return {
      key: doc.key,
      value: doc.value,
      updatedAt: doc.updatedAt || null,
    };
  },
});

export const setSetting = mutation({
  args: {
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    const now = new Date().toISOString();
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("appSettings", {
        key: args.key,
        value: args.value,
        updatedAt: now,
      });
    }
    return { success: true, key: args.key, value: args.value, updatedAt: now };
  },
});

export const listAllSettings = query({
  args: {},
  handler: async (ctx) => {
    const [labels, contractStatuses, consentForms, appSettings] = await Promise.all([
      ctx.db.query("systemLabels").collect(),
      ctx.db.query("systemContractStatuses").collect(),
      ctx.db.query("consentForms").collect(),
      ctx.db.query("appSettings").collect(),
    ]);
    const resolvedForms = await Promise.all(
      consentForms.map(async (f) => {
        const storageUrl = f.pdfStorageId
          ? await ctx.storage.getUrl(f.pdfStorageId)
          : null;
        return {
          ...f,
          storageUrl,
        };
      })
    );
    return {
      labels: labels.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
      contractStatuses: contractStatuses.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
      consentForms: resolvedForms,
      appSettings,
    };
  },
});

export const upsertContractStatus = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("systemContractStatuses")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        color: args.color ?? existing.color,
        sortOrder: args.sortOrder ?? existing.sortOrder,
      });
      return existing._id;
    }
    const all = await ctx.db.query("systemContractStatuses").collect();
    return await ctx.db.insert("systemContractStatuses", {
      name: args.name,
      color: args.color || "#2563eb",
      sortOrder: args.sortOrder ?? all.length + 1,
    });
  },
});

export const deleteContractStatus = mutation({
  args: { idOrName: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("systemContractStatuses").collect();
    const target = all.find(
      (s) => String(s._id) === args.idOrName || s.name === args.idOrName
    );
    if (!target) return { deleted: false };
    await ctx.db.delete(target._id);
    return { deleted: true };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getStorageFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getConsentFormPdfUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    const forms = await ctx.db.query("consentForms").collect();
    const matched = forms.find((f) => String(f.pdfStorageId || "") === args.storageId);
    if (!matched || !matched.pdfStorageId) return null;
    return await ctx.storage.getUrl(matched.pdfStorageId);
  },
});

export const upsertConsentForm = mutation({
  args: {
    formId: v.string(),
    name: v.string(),
    type: v.optional(v.string()),
    pdfPath: v.optional(v.string()),
    pdfStorageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    text: v.optional(v.string()),
    fieldsConfigJson: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("consentForms")
      .withIndex("by_formId", (q) => q.eq("formId", args.formId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        type: args.type ?? existing.type,
        pdfPath: args.pdfPath !== undefined ? args.pdfPath : existing.pdfPath,
        pdfStorageId:
          args.pdfStorageId !== undefined ? args.pdfStorageId : existing.pdfStorageId,
        fileName: args.fileName !== undefined ? args.fileName : existing.fileName,
        text: args.text !== undefined ? args.text : existing.text,
        fieldsConfigJson:
          args.fieldsConfigJson !== undefined
            ? args.fieldsConfigJson
            : existing.fieldsConfigJson,
        version: (existing.version || 1) + 1,
        enabled: args.enabled ?? existing.enabled,
        updatedAt: now,
      });
      return { formId: existing.formId, version: (existing.version || 1) + 1 };
    }
    await ctx.db.insert("consentForms", {
      formId: args.formId,
      name: args.name,
      type: args.type || "rental",
      pdfPath: args.pdfPath,
      pdfStorageId: args.pdfStorageId,
      fileName: args.fileName,
      text: args.text,
      fieldsConfigJson: args.fieldsConfigJson,
      version: 1,
      enabled: args.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    });
    return { formId: args.formId, version: 1 };
  },
});

export const deleteConsentForm = mutation({
  args: { formId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("consentForms")
      .withIndex("by_formId", (q) => q.eq("formId", args.formId))
      .first();
    if (!existing) return { deleted: false };
    await ctx.db.delete(existing._id);
    return { deleted: true };
  },
});
