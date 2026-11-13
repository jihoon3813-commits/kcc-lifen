import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";

export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    if (!user) return null;
    const orgs = await ctx.db.query("organizations").collect();
    const org = user.orgId
      ? orgs.find((o) => Number(o.orgId) === Number(user.orgId))
      : orgs.find((o) => o.name === user.orgName);
    const subPartnerCount = org
      ? orgs.filter((o) => Number(o.parentId) === Number(org.orgId)).length
      : 0;
    return {
      ...user,
      orgType: org?.type || (user.role === "partner" ? "partner" : "hq"),
      orgName: user.orgName || org?.name || "라이프앤조이",
      parentId: org?.parentId ?? null,
      level: org?.level ?? (user.role === "partner" ? 1 : 0),
      subPartnerCount,
    };
  },
});

export const getUserByUserId = query({
  args: { userId: v.number() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    const user = users.find((u) => Number(u.userId) === Number(args.userId));
    if (!user) return null;
    const orgs = await ctx.db.query("organizations").collect();
    const org = user.orgId
      ? orgs.find((o) => Number(o.orgId) === Number(user.orgId))
      : orgs.find((o) => o.name === user.orgName);
    const subPartnerCount = org
      ? orgs.filter((o) => Number(o.parentId) === Number(org.orgId)).length
      : 0;
    return {
      ...user,
      orgType: org?.type || (user.role === "partner" ? "partner" : "hq"),
      orgName: user.orgName || org?.name || "라이프앤조이",
      parentId: org?.parentId ?? null,
      level: org?.level ?? (user.role === "partner" ? 1 : 0),
      subPartnerCount,
    };
  },
});

export const listUsers = query({
  args: { includeInactive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const [users, orgs] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("organizations").collect(),
    ]);
    const filtered = args.includeInactive ? users : users.filter((u) => u.active);
    filtered.sort((a, b) => Number(a.userId || 0) - Number(b.userId || 0));
    return filtered.map((u) => {
      const org = u.orgId
        ? orgs.find((o) => Number(o.orgId) === Number(u.orgId))
        : orgs.find((o) => o.name === u.orgName);
      const subPartnerCount = org
        ? orgs.filter((o) => Number(o.parentId) === Number(org.orgId)).length
        : 0;
      return {
        ...u,
        orgType: org?.type || (u.role === "partner" ? "partner" : "hq"),
        orgName: u.orgName || org?.name || "라이프앤조이",
        parentId: org?.parentId ?? null,
        level: org?.level ?? (u.role === "partner" ? 1 : 0),
        subPartnerCount,
      };
    });
  },
});

export const createUser = mutation({
  args: {
    username: v.string(),
    passwordHash: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.string(),
    orgId: v.optional(v.number()),
    orgName: v.optional(v.string()),
    allowedMenus: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    if (existing) {
      throw new Error("이미 사용 중인 아이디입니다.");
    }
    const allUsers = await ctx.db.query("users").collect();
    let maxId = 0;
    for (const u of allUsers) {
      if (Number(u.userId || 0) > maxId) maxId = Number(u.userId);
    }
    const nextUserId = maxId + 1;
    let resolvedOrgId = args.orgId;
    let resolvedOrgName = args.orgName || "라이프앤조이";
    if (!resolvedOrgId && resolvedOrgName) {
      const org = await ctx.db
        .query("organizations")
        .withIndex("by_name", (q) => q.eq("name", resolvedOrgName))
        .first();
      if (org?.orgId) resolvedOrgId = org.orgId;
    }

    const docId = await ctx.db.insert("users", {
      userId: nextUserId,
      orgId: resolvedOrgId || 1,
      orgName: resolvedOrgName,
      username: args.username,
      passwordHash: args.passwordHash,
      name: args.name,
      phone: args.phone || "",
      email: args.email || "",
      role: args.role,
      allowedMenus: args.allowedMenus,
      active: true,
      createdAt: new Date().toISOString(),
    });
    return await ctx.db.get(docId);
  },
});

export const updateUser = mutation({
  args: {
    userId: v.number(),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.string()),
    orgId: v.optional(v.number()),
    orgName: v.optional(v.string()),
    allowedMenus: v.optional(v.string()),
    active: v.optional(v.boolean()),
    passwordHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    const target = users.find((u) => Number(u.userId) === Number(args.userId));
    if (!target) {
      throw new Error("사용자를 찾을 수 없습니다.");
    }
    const patch = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.phone !== undefined) patch.phone = args.phone;
    if (args.email !== undefined) patch.email = args.email;
    if (args.role !== undefined) patch.role = args.role;
    if (args.orgId !== undefined) patch.orgId = args.orgId;
    if (args.orgName !== undefined) patch.orgName = args.orgName;
    if (args.allowedMenus !== undefined) patch.allowedMenus = args.allowedMenus;
    if (args.active !== undefined) patch.active = args.active;
    if (args.passwordHash !== undefined) patch.passwordHash = args.passwordHash;

    await ctx.db.patch(target._id, patch);
    return await ctx.db.get(target._id);
  },
});
