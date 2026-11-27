import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";
import { recordDeletedArchive, recordEntitySnapshot } from "./archive.js";

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
      if (existing.value !== args.value) {
        await recordEntitySnapshot(ctx, {
          entityType: "setting",
          entityKey: `setting:${args.key}`,
          action: "overwrite_backup",
          title: `시스템 설정 백업 (${args.key})`,
          snapshot: { key: existing.key, value: existing.value, updatedAt: existing.updatedAt },
          savedBy: "시스템",
          createdAt: now,
        });
      }
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
    const [labels, stages, contractStatuses, consentForms, appSettings] = await Promise.all([
      ctx.db.query("systemLabels").collect(),
      ctx.db.query("systemStages").collect(),
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
      stages: stages.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
      contractStatuses: contractStatuses.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
      consentForms: resolvedForms,
      appSettings,
    };
  },
});

export const upsertStage = mutation({
  args: {
    idOrName: v.optional(v.string()),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    direction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const all = (await ctx.db.query("systemStages").collect()).sort(
      (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
    );

    if (args.idOrName && (args.direction === "up" || args.direction === "down")) {
      const idx = all.findIndex(
        (s) => String(s._id) === args.idOrName || s.name === args.idOrName
      );
      const swapIdx = args.direction === "up" ? idx - 1 : idx + 1;
      if (idx !== -1 && swapIdx >= 0 && swapIdx < all.length) {
        for (let i = 0; i < all.length; i++) {
          let order = i + 1;
          if (i === idx) order = swapIdx + 1;
          else if (i === swapIdx) order = idx + 1;
          await ctx.db.patch(all[i]._id, { sortOrder: order });
        }
      }
      return args.idOrName;
    }

    const nextName = (args.name || "").trim();
    if (!nextName) return null;

    if (args.idOrName) {
      const target = all.find(
        (s) => String(s._id) === args.idOrName || s.name === args.idOrName
      );
      if (target) {
        const oldName = target.name;
        await ctx.db.patch(target._id, {
          name: nextName,
          color: args.color ?? target.color ?? "blue",
          sortOrder: args.sortOrder ?? target.sortOrder,
        });
        if (oldName !== nextName) {
          const projects = await ctx.db.query("projects").collect();
          for (const p of projects) {
            if (p.status === oldName) {
              await ctx.db.patch(p._id, {
                status: nextName,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }
        return target._id;
      }
    }

    const existing = await ctx.db
      .query("systemStages")
      .withIndex("by_name", (q) => q.eq("name", nextName))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        color: args.color ?? existing.color ?? "blue",
        sortOrder: args.sortOrder ?? existing.sortOrder,
      });
      return existing._id;
    }
    return await ctx.db.insert("systemStages", {
      name: nextName,
      color: args.color || "blue",
      sortOrder: args.sortOrder ?? all.length + 1,
    });
  },
});

export const deleteStage = mutation({
  args: { idOrName: v.string(), userName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("systemStages").collect();
    if (all.length <= 1) return { deleted: false, reason: "min_limit" };
    const target = all.find(
      (s) => String(s._id) === args.idOrName || s.name === args.idOrName
    );
    if (!target) return { deleted: false };
    await recordDeletedArchive(ctx, {
      archiveType: "setting",
      targetKey: `stage:${target.name}`,
      title: `진행구분 상태값 · ${target.name}`,
      summary: `색상 ${target.color || "blue"} · 정렬순서 ${target.sortOrder}`,
      payload: { tableName: "systemStages", doc: target },
      deletedBy: args.userName || "관리자",
    });
    await ctx.db.delete(target._id);
    return { deleted: true, deletedName: target.name };
  },
});

export const upsertLabel = mutation({
  args: {
    idOrName: v.optional(v.string()),
    name: v.string(),
    color: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cleanName = args.name.trim();
    if (!cleanName) return null;
    const all = await ctx.db.query("systemLabels").collect();
    if (args.idOrName) {
      const target = all.find(
        (l) => String(l._id) === args.idOrName || l.name === args.idOrName
      );
      if (target) {
        await ctx.db.patch(target._id, {
          name: cleanName,
          color: args.color ?? target.color,
          sortOrder: args.sortOrder ?? target.sortOrder,
        });
        return target._id;
      }
    }
    const existing = await ctx.db
      .query("systemLabels")
      .withIndex("by_name", (q) => q.eq("name", cleanName))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        color: args.color ?? existing.color,
        sortOrder: args.sortOrder ?? existing.sortOrder,
      });
      return existing._id;
    }
    return await ctx.db.insert("systemLabels", {
      name: cleanName,
      color: args.color || "#2563eb",
      sortOrder: args.sortOrder ?? all.length + 1,
    });
  },
});

export const deleteLabel = mutation({
  args: { idOrName: v.string(), userName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("systemLabels").collect();
    if (all.length <= 1) return { deleted: false, reason: "min_limit" };
    const target = all.find(
      (l) => String(l._id) === args.idOrName || l.name === args.idOrName
    );
    if (!target) return { deleted: false };
    await recordDeletedArchive(ctx, {
      archiveType: "setting",
      targetKey: `label:${target.name}`,
      title: `진행라벨 · ${target.name}`,
      summary: `색상 ${target.color || "#2563eb"} · 정렬순서 ${target.sortOrder}`,
      payload: { tableName: "systemLabels", doc: target },
      deletedBy: args.userName || "관리자",
    });
    await ctx.db.delete(target._id);
    return { deleted: true, deletedName: target.name };
  },
});

export const upsertContractStatus = mutation({
  args: {
    idOrName: v.optional(v.string()),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    direction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const all = (await ctx.db.query("systemContractStatuses").collect()).sort(
      (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
    );

    if (args.idOrName && (args.direction === "up" || args.direction === "down")) {
      const idx = all.findIndex(
        (s) => String(s._id) === args.idOrName || s.name === args.idOrName
      );
      const swapIdx = args.direction === "up" ? idx - 1 : idx + 1;
      if (idx !== -1 && swapIdx >= 0 && swapIdx < all.length) {
        for (let i = 0; i < all.length; i++) {
          let order = i + 1;
          if (i === idx) order = swapIdx + 1;
          else if (i === swapIdx) order = idx + 1;
          await ctx.db.patch(all[i]._id, { sortOrder: order });
        }
      }
      return args.idOrName;
    }

    const nextName = (args.name || "").trim();
    if (!nextName) return null;

    if (args.idOrName) {
      const target = all.find(
        (s) => String(s._id) === args.idOrName || s.name === args.idOrName
      );
      if (target) {
        const oldName = target.name;
        await ctx.db.patch(target._id, {
          name: nextName,
          color: args.color ?? target.color,
          sortOrder: args.sortOrder ?? target.sortOrder,
        });
        if (oldName !== nextName) {
          const contracts = await ctx.db.query("contracts").collect();
          for (const c of contracts) {
            if (c.status === oldName) {
              await ctx.db.patch(c._id, {
                status: nextName,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }
        return target._id;
      }
    }

    const existing = await ctx.db
      .query("systemContractStatuses")
      .withIndex("by_name", (q) => q.eq("name", nextName))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        color: args.color ?? existing.color,
        sortOrder: args.sortOrder ?? existing.sortOrder,
      });
      return existing._id;
    }
    return await ctx.db.insert("systemContractStatuses", {
      name: nextName,
      color: args.color || "#2563eb",
      sortOrder: args.sortOrder ?? all.length + 1,
    });
  },
});

export const deleteContractStatus = mutation({
  args: { idOrName: v.string(), userName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("systemContractStatuses").collect();
    const target = all.find(
      (s) => String(s._id) === args.idOrName || s.name === args.idOrName
    );
    if (!target) return { deleted: false };
    await recordDeletedArchive(ctx, {
      archiveType: "setting",
      targetKey: `contractStatus:${target.name}`,
      title: `계약·수납 상태값 · ${target.name}`,
      summary: `색상 ${target.color || "#2563eb"} · 정렬순서 ${target.sortOrder}`,
      payload: { tableName: "systemContractStatuses", doc: target },
      deletedBy: args.userName || "관리자",
    });
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
  args: { formId: v.string(), userName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("consentForms")
      .withIndex("by_formId", (q) => q.eq("formId", args.formId))
      .first();
    if (!existing) return { deleted: false };
    await recordDeletedArchive(ctx, {
      archiveType: "setting",
      targetKey: `form:${existing.formId}`,
      title: `전자동의 양식 · ${existing.name} (v${existing.version || 1})`,
      summary: `파일명 ${existing.fileName || "없음"} · 양식코드 ${existing.formId}`,
      payload: { tableName: "consentForms", doc: existing },
      deletedBy: args.userName || "관리자",
    });
    await ctx.db.delete(existing._id);
    return { deleted: true };
  },
});
