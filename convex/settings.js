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
