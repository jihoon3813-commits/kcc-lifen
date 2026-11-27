import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";

const LEDGER_SETTING_KEY = "crm_payment_ledger_v1";

export function stripSystemFields(doc) {
  if (!doc || typeof doc !== "object") return doc;
  const { _id, _creationTime, ...rest } = doc;
  return rest;
}

export async function recordDeletedArchive(ctx, {
  archiveType,
  targetKey,
  projectId,
  title,
  summary,
  payload,
  deletedBy,
  deletedAt,
}) {
  const now = deletedAt || new Date().toISOString();
  return await ctx.db.insert("deletedArchives", {
    archiveType,
    targetKey: String(targetKey || ""),
    projectId: projectId !== undefined && projectId !== null ? Number(projectId) : undefined,
    title: String(title || targetKey || archiveType),
    summary: summary ? String(summary) : undefined,
    payloadJson: JSON.stringify(payload ?? {}),
    deletedBy: deletedBy ? String(deletedBy) : "관리자",
    deletedAt: now,
  });
}

export async function recordEntitySnapshot(ctx, {
  entityType,
  entityKey,
  projectId,
  action,
  title,
  snapshot,
  savedBy,
  createdAt,
}) {
  const now = createdAt || new Date().toISOString();
  return await ctx.db.insert("entitySnapshots", {
    entityType,
    entityKey: String(entityKey || ""),
    projectId: projectId !== undefined && projectId !== null ? Number(projectId) : undefined,
    action: String(action || "save"),
    title: String(title || entityKey || entityType),
    snapshotJson: JSON.stringify(snapshot ?? {}),
    savedBy: savedBy ? String(savedBy) : "관리자",
    createdAt: now,
  });
}

async function restoreQuoteBundle(ctx, quoteData, itemsData) {
  if (!quoteData) return { restoredQuotes: 0, restoredItems: 0 };
  const cleanQuote = stripSystemFields(quoteData);
  const pId = Number(cleanQuote.projectId);
  const ver = Number(cleanQuote.version);

  const existingQuotes = await ctx.db
    .query("quotes")
    .withIndex("by_project", (q) => q.eq("projectId", pId))
    .take(200);
  const matchedQuote = existingQuotes.find((q) => Number(q.version) === ver);

  if (matchedQuote) {
    await ctx.db.patch(matchedQuote._id, {
      ...cleanQuote,
      updatedAt: new Date().toISOString(),
    });
  } else {
    await ctx.db.insert("quotes", cleanQuote);
  }

  const existingItems = await ctx.db
    .query("quoteItems")
    .withIndex("by_project", (q) => q.eq("projectId", pId))
    .take(1000);
  for (const oldItem of existingItems) {
    if (Number(oldItem.quoteVersion) === ver) {
      await ctx.db.delete(oldItem._id);
    }
  }

  let restoredItems = 0;
  const safeItems = Array.isArray(itemsData) ? itemsData : [];
  for (const rawItem of safeItems) {
    const cleanItem = stripSystemFields(rawItem);
    await ctx.db.insert("quoteItems", {
      ...cleanItem,
      projectId: pId,
      quoteVersion: ver,
    });
    restoredItems += 1;
  }

  return { restoredQuotes: 1, restoredItems };
}

async function mergeLedgerRestore(ctx, contractMetaMap, paymentOrdersList) {
  const hasMeta = contractMetaMap && typeof contractMetaMap === "object" && Object.keys(contractMetaMap).length > 0;
  const hasOrders = Array.isArray(paymentOrdersList) && paymentOrdersList.length > 0;
  if (!hasMeta && !hasOrders) return;

  const existingDoc = await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", LEDGER_SETTING_KEY))
    .first();

  let ledger = { version: 1, contractMeta: {}, paymentOrders: [] };
  if (existingDoc?.value) {
    try {
      const parsed = JSON.parse(existingDoc.value);
      if (parsed && typeof parsed === "object") {
        ledger = {
          version: 1,
          contractMeta: parsed.contractMeta && typeof parsed.contractMeta === "object" ? parsed.contractMeta : {},
          paymentOrders: Array.isArray(parsed.paymentOrders) ? parsed.paymentOrders : [],
        };
      }
    } catch {}
  }

  if (hasMeta) {
    for (const [contractNo, metaVal] of Object.entries(contractMetaMap)) {
      if (metaVal && typeof metaVal === "object") {
        ledger.contractMeta[contractNo] = metaVal;
      }
    }
  }

  if (hasOrders) {
    const existingOrderIds = new Set(ledger.paymentOrders.map((o) => o.orderId));
    for (const ord of paymentOrdersList) {
      if (!ord || !ord.orderId) continue;
      if (existingOrderIds.has(ord.orderId)) {
        ledger.paymentOrders = ledger.paymentOrders.map((existingOrd) =>
          existingOrd.orderId === ord.orderId ? ord : existingOrd
        );
      } else {
        ledger.paymentOrders.unshift(ord);
        existingOrderIds.add(ord.orderId);
      }
    }
  }

  const now = new Date().toISOString();
  const nextVal = JSON.stringify(ledger);
  if (existingDoc) {
    await ctx.db.patch(existingDoc._id, { value: nextVal, updatedAt: now });
  } else {
    await ctx.db.insert("appSettings", { key: LEDGER_SETTING_KEY, value: nextVal, updatedAt: now });
  }
}

// 복구 보관함 목록 조회
export const listDeletedArchives = query({
  args: {
    archiveType: v.optional(v.string()),
    includeRestored: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const takeLimit = Math.min(200, Math.max(1, args.limit ?? 100));
    let rows;
    if (args.archiveType && args.archiveType !== "all") {
      rows = await ctx.db
        .query("deletedArchives")
        .withIndex("by_archiveType_and_deletedAt", (q) => q.eq("archiveType", args.archiveType))
        .order("desc")
        .take(takeLimit);
    } else {
      rows = await ctx.db
        .query("deletedArchives")
        .withIndex("by_deletedAt")
        .order("desc")
        .take(takeLimit);
    }

    const filtered = args.includeRestored ? rows : rows.filter((r) => !r.restoredAt);
    return filtered.map((r) => ({
      id: String(r._id),
      archiveType: r.archiveType,
      targetKey: r.targetKey,
      projectId: r.projectId ?? null,
      title: r.title,
      summary: r.summary || "",
      deletedBy: r.deletedBy || "관리자",
      deletedAt: r.deletedAt,
      restoredAt: r.restoredAt || null,
      restoredBy: r.restoredBy || null,
    }));
  },
});

// 특정 엔티티의 최신 저장 스냅샷 조회 (예: 견적 품목 백업 조회)
export const listEntitySnapshots = query({
  args: {
    entityType: v.string(),
    entityKey: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const takeLimit = Math.min(100, Math.max(1, args.limit ?? 30));
    let rows;
    if (args.entityKey) {
      rows = await ctx.db
        .query("entitySnapshots")
        .withIndex("by_entityType_and_entityKey", (q) =>
          q.eq("entityType", args.entityType).eq("entityKey", args.entityKey)
        )
        .order("desc")
        .take(takeLimit);
    } else {
      rows = await ctx.db
        .query("entitySnapshots")
        .withIndex("by_createdAt")
        .order("desc")
        .take(takeLimit);
      rows = rows.filter((r) => r.entityType === args.entityType);
    }
    return rows.map((r) => ({
      id: String(r._id),
      entityType: r.entityType,
      entityKey: r.entityKey,
      projectId: r.projectId ?? null,
      action: r.action,
      title: r.title,
      savedBy: r.savedBy || "관리자",
      createdAt: r.createdAt,
    }));
  },
});

// 오삭제 데이터 100% 원복 실행
export const restoreDeletedArchive = mutation({
  args: {
    archiveId: v.id("deletedArchives"),
    userName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const archive = await ctx.db.get(args.archiveId);
    if (!archive) {
      return { ok: false, error: "복구 보관함 항목을 찾을 수 없습니다." };
    }

    let payload = {};
    try {
      payload = JSON.parse(archive.payloadJson || "{}");
    } catch {
      return { ok: false, error: "보관된 백업 데이터 형식이 올바르지 않습니다." };
    }

    const now = new Date().toISOString();
    const actor = args.userName || "관리자";
    let restoredDetail = "";

    if (archive.archiveType === "quote") {
      const { restoredQuotes, restoredItems } = await restoreQuoteBundle(
        ctx,
        payload.quote,
        payload.quoteItems
      );
      restoredDetail = `견적서 ${restoredQuotes}건 및 세부 품목 ${restoredItems}건 원복 완료`;
      if (archive.projectId) {
        await ctx.db.insert("auditLogs", {
          projectId: archive.projectId,
          userName: actor,
          action: "견적서 복원",
          detail: `${archive.title} (${restoredDetail})`,
          createdAt: now,
        });
      }
    } else if (archive.archiveType === "quote_inquiry") {
      const rows = Array.isArray(payload.consultations) ? payload.consultations : [];
      let count = 0;
      for (const rawC of rows) {
        const cleanC = stripSystemFields(rawC);
        await ctx.db.insert("consultations", cleanC);
        count += 1;
      }
      restoredDetail = `고객 견적 문의 ${count}건 원복 완료`;
      if (archive.projectId) {
        await ctx.db.insert("auditLogs", {
          projectId: archive.projectId,
          userName: actor,
          action: "견적 문의 복원",
          detail: restoredDetail,
          createdAt: now,
        });
      }
    } else if (archive.archiveType === "project") {
      const projects = Array.isArray(payload.projects) ? payload.projects : [];
      for (const rawP of projects) {
        const cleanP = stripSystemFields(rawP);
        const existingP = await ctx.db
          .query("projects")
          .withIndex("by_projectId", (q) => q.eq("projectId", Number(cleanP.projectId)))
          .first();
        if (!existingP) {
          await ctx.db.insert("projects", cleanP);
        }
      }

      const quotes = Array.isArray(payload.quotes) ? payload.quotes : [];
      const allItems = Array.isArray(payload.quoteItems) ? payload.quoteItems : [];
      for (const qDoc of quotes) {
        const vItems = allItems.filter(
          (it) =>
            Number(it.projectId) === Number(qDoc.projectId) &&
            Number(it.quoteVersion) === Number(qDoc.version)
        );
        await restoreQuoteBundle(ctx, qDoc, vItems);
      }

      const contracts = Array.isArray(payload.contracts) ? payload.contracts : [];
      for (const rawCt of contracts) {
        const cleanCt = stripSystemFields(rawCt);
        const existingCt = await ctx.db
          .query("contracts")
          .withIndex("by_contractNo", (q) => q.eq("contractNo", cleanCt.contractNo))
          .first();
        if (!existingCt) {
          await ctx.db.insert("contracts", cleanCt);
        }
      }

      const simpleChildTables = [
        ["consultations", payload.consultations],
        ["quoteViews", payload.quoteViews],
        ["quoteDispatches", payload.quoteDispatches],
        ["auditLogs", payload.auditLogs],
      ];
      for (const [tableName, list] of simpleChildTables) {
        if (!Array.isArray(list)) continue;
        for (const row of list) {
          await ctx.db.insert(tableName, stripSystemFields(row));
        }
      }

      if (Array.isArray(payload.rentalApplications)) {
        for (const ra of payload.rentalApplications) {
          const cleanRa = stripSystemFields(ra);
          const existingRa = await ctx.db
            .query("rentalApplications")
            .withIndex("by_appNo", (q) => q.eq("appNo", cleanRa.appNo))
            .first();
          if (!existingRa) {
            await ctx.db.insert("rentalApplications", cleanRa);
          }
        }
      }

      await mergeLedgerRestore(ctx, payload.contractMeta, payload.paymentOrders);
      restoredDetail = `고객 공사건 및 연결 견적(${quotes.length}건)·품목(${allItems.length}건)·계약(${contracts.length}건) 전체 원복 완료`;
      if (archive.projectId) {
        await ctx.db.insert("auditLogs", {
          projectId: archive.projectId,
          userName: actor,
          action: "고객 통합 복원",
          detail: `${archive.title} · ${restoredDetail}`,
          createdAt: now,
        });
      }
    } else if (archive.archiveType === "contract") {
      if (payload.contract) {
        const cleanCt = stripSystemFields(payload.contract);
        const existingCt = await ctx.db
          .query("contracts")
          .withIndex("by_contractNo", (q) => q.eq("contractNo", cleanCt.contractNo))
          .first();
        if (existingCt) {
          await ctx.db.patch(existingCt._id, { ...cleanCt, updatedAt: now });
        } else {
          await ctx.db.insert("contracts", cleanCt);
        }
      }
      await mergeLedgerRestore(ctx, payload.contractMeta, payload.paymentOrders);
      restoredDetail = `계약 및 수납·결제 원장 데이터 원복 완료`;
      if (archive.projectId) {
        await ctx.db.insert("auditLogs", {
          projectId: archive.projectId,
          userName: actor,
          action: "계약 복원",
          detail: `${archive.title} (${restoredDetail})`,
          createdAt: now,
        });
      }
    } else if (archive.archiveType === "landing_link") {
      if (payload.landingLink) {
        const cleanLink = stripSystemFields(payload.landingLink);
        const existingLink = await ctx.db
          .query("landingLinks")
          .withIndex("by_linkId", (q) => q.eq("linkId", Number(cleanLink.linkId)))
          .first();
        if (!existingLink) {
          await ctx.db.insert("landingLinks", cleanLink);
        }
      }
      restoredDetail = `광고·랜딩 링크 원복 완료`;
    } else if (archive.archiveType === "partner") {
      if (payload.organization) {
        const cleanOrg = stripSystemFields(payload.organization);
        const existingOrg = await ctx.db
          .query("organizations")
          .withIndex("by_name", (q) => q.eq("name", cleanOrg.name))
          .first();
        if (!existingOrg) {
          await ctx.db.insert("organizations", cleanOrg);
        }
      }
      if (Array.isArray(payload.users)) {
        for (const u of payload.users) {
          const cleanU = stripSystemFields(u);
          const existingU = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", cleanU.username))
            .first();
          if (!existingU) {
            await ctx.db.insert("users", cleanU);
          }
        }
      }
      restoredDetail = `파트너 조직 및 연결 계정 원복 완료`;
    } else if (archive.archiveType === "setting") {
      const { tableName, doc } = payload;
      if (tableName && doc) {
        const cleanDoc = stripSystemFields(doc);
        if (tableName === "consentForms" && cleanDoc.formId) {
          const ex = await ctx.db
            .query("consentForms")
            .withIndex("by_formId", (q) => q.eq("formId", cleanDoc.formId))
            .first();
          if (!ex) await ctx.db.insert("consentForms", cleanDoc);
        } else if (
          ["systemStages", "systemLabels", "systemContractStatuses"].includes(tableName) &&
          cleanDoc.name
        ) {
          const ex = await ctx.db
            .query(tableName)
            .withIndex("by_name", (q) => q.eq("name", cleanDoc.name))
            .first();
          if (!ex) await ctx.db.insert(tableName, cleanDoc);
        }
      }
      restoredDetail = `시스템 설정 항목 원복 완료`;
    } else {
      return { ok: false, error: `지원하지 않는 복구 유형입니다: ${archive.archiveType}` };
    }

    await ctx.db.patch(archive._id, {
      restoredAt: now,
      restoredBy: actor,
    });

    return {
      ok: true,
      archiveId: String(archive._id),
      archiveType: archive.archiveType,
      title: archive.title,
      detail: restoredDetail,
      restoredAt: now,
    };
  },
});
