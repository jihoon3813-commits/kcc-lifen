import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";

const MESSAGING_SETTING_KEY = "integrations_messaging";
const HEARTBEAT_SETTING_KEY = "sms_bridge_heartbeat";

async function readBridgeSecret(ctx) {
  const doc = await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", MESSAGING_SETTING_KEY))
    .first();
  if (!doc?.value) return "";
  try {
    const parsed = JSON.parse(doc.value);
    return String(parsed?.bridgeSecret || "").trim();
  } catch {
    return "";
  }
}

async function upsertHeartbeat(ctx, { deviceName, appVersion, now }) {
  const existing = await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", HEARTBEAT_SETTING_KEY))
    .first();
  const payload = JSON.stringify({
    deviceName: deviceName || existing?.deviceName || "Android Phone",
    appVersion: appVersion || "",
    lastPollAt: now,
  });
  const iso = new Date(now).toISOString();
  if (existing) {
    await ctx.db.patch(existing._id, { value: payload, updatedAt: iso });
  } else {
    await ctx.db.insert("appSettings", {
      key: HEARTBEAT_SETTING_KEY,
      value: payload,
      updatedAt: iso,
    });
  }
}

export const enqueueOutbox = mutation({
  args: {
    receiverPhone: v.string(),
    title: v.optional(v.string()),
    message: v.string(),
    projectId: v.optional(v.number()),
    quoteId: v.optional(v.number()),
    recipientName: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("smsOutbox", {
      receiverPhone: String(args.receiverPhone || "").trim(),
      title: args.title ? String(args.title).trim() : undefined,
      message: String(args.message || "").trim(),
      status: "pending",
      projectId: args.projectId,
      quoteId: args.quoteId,
      recipientName: args.recipientName,
      createdBy: args.createdBy,
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    });
    return { outboxId: String(id), status: "pending", createdAt: now };
  },
});

export const pollOutbox = mutation({
  args: {
    secret: v.string(),
    deviceName: v.optional(v.string()),
    appVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const configured = await readBridgeSecret(ctx);
    const incoming = String(args.secret || "").trim();
    if (!configured || incoming !== configured) {
      return {
        ok: false,
        error: "브릿지 시크릿 키가 일치하지 않습니다.",
        jobs: [],
        serverNow: now,
        recentOutbounds: [],
      };
    }

    await upsertHeartbeat(ctx, {
      deviceName: args.deviceName ? String(args.deviceName).trim() : "",
      appVersion: args.appVersion ? String(args.appVersion).trim() : "",
      now,
    });

    // Stale processing recovery (> 60s)
    const staleProcessing = await ctx.db
      .query("smsOutbox")
      .withIndex("by_status", (q) => q.eq("status", "processing"))
      .take(10);
    for (const row of staleProcessing) {
      if (now - (row.updatedAt || row.createdAt || 0) > 60_000) {
        if ((row.attempts || 0) >= 3) {
          await ctx.db.patch(row._id, {
            status: "failed",
            errorMessage: "폰 브릿지 응답 시간 초과",
            updatedAt: now,
          });
        } else {
          await ctx.db.patch(row._id, {
            status: "pending",
            updatedAt: now,
          });
        }
      }
    }

    const pending = await ctx.db
      .query("smsOutbox")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(5);

    const jobs = [];
    for (const job of pending) {
      await ctx.db.patch(job._id, {
        status: "processing",
        attempts: (job.attempts || 0) + 1,
        deviceName: args.deviceName ? String(args.deviceName).trim() : job.deviceName,
        updatedAt: now,
      });
      jobs.push({
        outboxId: String(job._id),
        receiverPhone: job.receiverPhone,
        title: job.title || "",
        message: job.message,
      });
    }

    return {
      ok: true,
      error: null,
      jobs,
      serverNow: now,
      recentOutbounds: [],
    };
  },
});

export const ackOutbox = mutation({
  args: {
    secret: v.string(),
    outboxId: v.string(),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const configured = await readBridgeSecret(ctx);
    const incoming = String(args.secret || "").trim();
    if (!configured || incoming !== configured) {
      return { ok: false, error: "브릿지 시크릿 키가 일치하지 않습니다." };
    }

    const normalizedId = ctx.db.normalizeId("smsOutbox", String(args.outboxId || "").trim());
    if (!normalizedId) {
      return { ok: false, error: "유효하지 않은 outboxId입니다." };
    }

    const doc = await ctx.db.get(normalizedId);
    if (!doc) {
      return { ok: false, error: "대기열 항목을 찾을 수 없습니다." };
    }

    await ctx.db.patch(normalizedId, {
      status: args.success ? "sent" : "failed",
      sentAt: args.success ? now : doc.sentAt,
      errorMessage: args.success
        ? undefined
        : String(args.errorMessage || "휴대폰 발송 실패").trim(),
      updatedAt: now,
    });

    return { ok: true };
  },
});

export const syncMessages = mutation({
  args: {
    secret: v.string(),
    deviceName: v.optional(v.string()),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const configured = await readBridgeSecret(ctx);
    const incoming = String(args.secret || "").trim();
    if (!configured || incoming !== configured) {
      return { ok: false, synced: 0, error: "브릿지 시크릿 키가 일치하지 않습니다." };
    }
    return { ok: true, synced: Number(args.count || 0) };
  },
});

export const getBridgeStatus = query({
  args: {},
  handler: async (ctx) => {
    const hbDoc = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", HEARTBEAT_SETTING_KEY))
      .first();

    let heartbeat = null;
    if (hbDoc?.value) {
      try {
        heartbeat = JSON.parse(hbDoc.value);
      } catch {
        heartbeat = null;
      }
    }

    const pendingRows = await ctx.db
      .query("smsOutbox")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(50);

    const recentRows = await ctx.db
      .query("smsOutbox")
      .withIndex("by_createdAt")
      .order("desc")
      .take(10);

    return {
      heartbeat,
      pendingCount: pendingRows.length,
      recent: recentRows.map((r) => ({
        outboxId: String(r._id),
        receiverPhone: r.receiverPhone,
        recipientName: r.recipientName || "",
        status: r.status,
        errorMessage: r.errorMessage || "",
        createdAt: r.createdAt,
        sentAt: r.sentAt || null,
      })),
    };
  },
});
