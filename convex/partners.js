import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";

function findPartnerOrg(orgs, rawId) {
  const numId = Number(rawId);
  if (!Number.isNaN(numId) && numId > 0) {
    const byOrgId = orgs.find((o) => o.type === "partner" && Number(o.orgId) === numId);
    if (byOrgId) return byOrgId;
  }
  const strId = String(rawId || "").trim();
  return (
    orgs.find(
      (o) =>
        o.type === "partner" &&
        (o.code === strId || o.name === strId || String(o._id) === strId)
    ) || null
  );
}

export const listPartners = query({
  args: {
    callerRole: v.string(),
    callerOrgId: v.number(),
  },
  handler: async (ctx, args) => {
    const [orgs, users, projects, contracts] = await Promise.all([
      ctx.db.query("organizations").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("projects").collect(),
      ctx.db.query("contracts").collect(),
    ]);

    const isPartner = args.callerRole === "partner";
    const partnerOrgs = orgs
      .filter((o) => o.type === "partner")
      .filter((o) => {
        if (!isPartner) return true;
        return Number(o.parentId) === args.callerOrgId || Number(o.orgId) === args.callerOrgId;
      })
      .sort((a, b) => (a.level || 1) - (b.level || 1) || (a.orgId || 0) - (b.orgId || 0));

    const partners = partnerOrgs.map((o) => {
      const orgId = Number(o.orgId || 0);
      const parent = o.parentId
        ? orgs.find((p) => Number(p.orgId) === Number(o.parentId))
        : null;
      const linkedUser = users.find(
        (u) => u.role === "partner" && (Number(u.orgId) === orgId || u.orgName === o.name)
      );
      const subPartnerCount = orgs.filter((sub) => Number(sub.parentId) === orgId).length;
      const orgProjects = projects.filter(
        (pr) => Number(pr.orgId) === orgId || pr.partnerName === o.name
      );
      const projectIdSet = new Set(orgProjects.map((pr) => pr.projectId));
      const contractCount = contracts.filter((ct) => projectIdSet.has(ct.projectId)).length;

      return {
        id: o.code || `P${String(orgId).padStart(3, "0")}`,
        orgId,
        name: o.name,
        code: o.code || "",
        person: linkedUser?.name || "담당자",
        email: linkedUser?.email || "partner@example.com",
        phone: o.phone || linkedUser?.phone || "",
        type: "인테리어",
        active: linkedUser ? Boolean(linkedUser.active) : true,
        parentId: o.parentId ?? null,
        parentName: parent?.name || (o.parentId ? "상위 파트너" : "본사 직속 (1차 파트너)"),
        level: o.level || 1,
        levelLabel: `${o.level || 1}차 파트너`,
        subPartnerCount,
        customerCount: orgProjects.length,
        contractCount,
        username: linkedUser?.username || "",
        createdAt: o.createdAt || "",
      };
    });

    const subPartners = isPartner
      ? partners.filter((p) => Number(p.parentId) === args.callerOrgId)
      : partners;

    return {
      partners,
      subPartners,
      isPartner,
      myOrgId: isPartner ? args.callerOrgId : null,
      totalCount: partners.length,
    };
  },
});

export const createPartner = mutation({
  args: {
    callerRole: v.string(),
    callerOrgId: v.number(),
    name: v.string(),
    person: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.string(),
    parentId: v.optional(v.number()),
    username: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanName = args.name.trim();
    const targetUsername = args.username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");

    const [orgs, users] = await Promise.all([
      ctx.db.query("organizations").collect(),
      ctx.db.query("users").collect(),
    ]);

    if (users.some((u) => u.username === targetUsername)) {
      return {
        ok: false,
        status: 400,
        error: `이미 사용 중인 로그인 아이디(${targetUsername})입니다. 다른 아이디를 입력해 주세요.`,
      };
    }

    if (orgs.some((o) => o.name === cleanName)) {
      return {
        ok: false,
        status: 400,
        error: `이미 등록된 파트너사명(${cleanName})입니다.`,
      };
    }

    let targetParentId;
    let targetLevel = 1;
    if (args.callerRole === "partner") {
      targetParentId = args.callerOrgId;
    } else if (args.parentId && args.parentId > 0) {
      targetParentId = args.parentId;
    }

    if (targetParentId !== undefined) {
      const parentOrg = orgs.find((o) => Number(o.orgId) === Number(targetParentId));
      if (parentOrg) {
        targetLevel = (parentOrg.level || 1) + 1;
      } else {
        targetParentId = undefined;
      }
    }

    let maxOrgId = 0;
    for (const o of orgs) {
      if (Number(o.orgId || 0) > maxOrgId) maxOrgId = Number(o.orgId);
    }
    const newOrgId = maxOrgId + 1;

    const partnerCount = orgs.filter((o) => o.type === "partner").length;
    let code = `P${String(partnerCount + 1).padStart(3, "0")}`;
    let offset = 2;
    while (orgs.some((o) => o.code === code)) {
      code = `P${String(partnerCount + offset).padStart(3, "0")}`;
      offset++;
    }

    const now = new Date().toISOString();
    const orgDoc = {
      orgId: newOrgId,
      name: cleanName,
      type: "partner",
      code,
      phone: args.phone,
      level: targetLevel,
      createdAt: now,
    };
    if (targetParentId !== undefined) {
      orgDoc.parentId = targetParentId;
    }
    await ctx.db.insert("organizations", orgDoc);

    let maxUserId = 0;
    for (const u of users) {
      if (Number(u.userId || 0) > maxUserId) maxUserId = Number(u.userId);
    }
    const newUserId = maxUserId + 1;
    const contactPerson = (args.person || "").trim() || cleanName;
    const partnerEmail = (args.email || "").trim() || `${targetUsername}@example.com`;
    const defaultMenus = JSON.stringify(["customers", "products", "stats"]);

    await ctx.db.insert("users", {
      userId: newUserId,
      orgId: newOrgId,
      orgName: cleanName,
      username: targetUsername,
      passwordHash: args.passwordHash,
      name: contactPerson,
      phone: args.phone,
      email: partnerEmail,
      role: "partner",
      allowedMenus: defaultMenus,
      active: true,
      createdAt: now,
    });

    if (targetParentId !== undefined) {
      const parentUsers = users.filter(
        (u) => Number(u.orgId) === Number(targetParentId) && u.role === "partner"
      );
      for (const pu of parentUsers) {
        let menus = [];
        try {
          menus = JSON.parse(pu.allowedMenus || "[]");
        } catch {
          menus = ["customers", "products", "stats"];
        }
        if (Array.isArray(menus) && !menus.includes("partners")) {
          menus.push("partners");
          await ctx.db.patch(pu._id, { allowedMenus: JSON.stringify(menus) });
        }
      }
    }

    return {
      ok: true,
      status: 201,
      data: {
        id: code,
        orgId: newOrgId,
        name: cleanName,
        code,
        level: targetLevel,
        parentId: targetParentId ?? null,
        username: targetUsername,
        person: contactPerson,
        message: `${targetLevel}차 파트너 [${cleanName}] 및 관리자 계정(${targetUsername})이 등록되었습니다.`,
      },
    };
  },
});

export const updatePartner = mutation({
  args: {
    callerRole: v.string(),
    callerOrgId: v.number(),
    idOrCode: v.string(),
    name: v.optional(v.string()),
    person: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    parentId: v.optional(v.union(v.number(), v.null())),
    username: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    fallbackPasswordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const [orgs, users] = await Promise.all([
      ctx.db.query("organizations").collect(),
      ctx.db.query("users").collect(),
    ]);

    const org = findPartnerOrg(orgs, args.idOrCode);
    if (!org) {
      return { ok: false, status: 404, error: "파트너를 찾을 수 없습니다." };
    }

    const targetOrgId = Number(org.orgId);
    if (args.callerRole === "partner" && Number(org.parentId) !== args.callerOrgId) {
      return { ok: false, status: 403, error: "소속 하위 파트너 정보만 수정할 수 있습니다." };
    }

    const cleanName = args.name ? args.name.trim() : org.name;
    if (cleanName && cleanName !== org.name) {
      const dupOrg = orgs.find((o) => o.name === cleanName && o._id !== org._id);
      if (dupOrg) {
        return {
          ok: false,
          status: 400,
          error: `이미 등록된 다른 파트너사명(${cleanName})입니다.`,
        };
      }
    }

    let nextParentId = org.parentId;
    let nextLevel = org.level || 1;
    if (args.callerRole === "hq_admin" && args.parentId !== undefined) {
      if (args.parentId && Number(args.parentId) > 0 && Number(args.parentId) !== targetOrgId) {
        const pOrg = orgs.find((o) => Number(o.orgId) === Number(args.parentId));
        if (pOrg) {
          nextParentId = Number(pOrg.orgId);
          nextLevel = (pOrg.level || 1) + 1;
        }
      } else if (args.parentId === null || Number(args.parentId) === 0) {
        nextParentId = undefined;
        nextLevel = 1;
      }
    }

    const existingUser = users.find(
      (u) =>
        u.role === "partner" &&
        (Number(u.orgId) === targetOrgId || u.orgName === org.name)
    );

    let newUsername = existingUser?.username;
    if (existingUser && args.username) {
      const cleanU = args.username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (cleanU && cleanU !== existingUser.username) {
        const dupUser = users.find((u) => u.username === cleanU && u._id !== existingUser._id);
        if (dupUser) {
          return {
            ok: false,
            status: 400,
            error: `이미 사용 중인 로그인 아이디(${cleanU})입니다.`,
          };
        }
        newUsername = cleanU;
      }
    }

    const orgPatch = {
      name: cleanName || org.name,
      level: nextLevel,
      parentId: nextParentId,
    };
    if (args.phone !== undefined) {
      orgPatch.phone = args.phone;
    }
    await ctx.db.patch(org._id, orgPatch);

    if (existingUser) {
      const userPatch = {
        username: newUsername,
        orgName: cleanName || org.name,
      };
      if (args.passwordHash) userPatch.passwordHash = args.passwordHash;
      if (args.person && args.person.trim()) userPatch.name = args.person.trim();
      if (args.email !== undefined && args.email.trim()) userPatch.email = args.email.trim();
      if (args.phone !== undefined) userPatch.phone = args.phone;
      await ctx.db.patch(existingUser._id, userPatch);
    } else {
      let targetUsername = args.username
        ? args.username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "")
        : "";
      if (!targetUsername) {
        targetUsername = `partner_${(org.code || String(targetOrgId)).toLowerCase()}`;
      }

      const baseUsername = targetUsername;
      let uSuffix = 1;
      while (users.some((u) => u.username === targetUsername)) {
        targetUsername = `${baseUsername}_${uSuffix}`;
        uSuffix++;
      }

      let maxUserId = 0;
      for (const u of users) {
        if (Number(u.userId || 0) > maxUserId) maxUserId = Number(u.userId);
      }

      await ctx.db.insert("users", {
        userId: maxUserId + 1,
        orgId: targetOrgId,
        orgName: cleanName || org.name,
        username: targetUsername,
        passwordHash: args.passwordHash || args.fallbackPasswordHash,
        name: (args.person || "").trim() || cleanName || org.name,
        phone: args.phone ?? org.phone ?? "",
        email: (args.email || "").trim() || `${targetUsername}@example.com`,
        role: "partner",
        allowedMenus: JSON.stringify(["customers", "products", "stats"]),
        active: true,
        createdAt: new Date().toISOString(),
      });
    }

    return {
      ok: true,
      status: 200,
      data: { message: "파트너 정보 및 계정이 정상적으로 수정되었습니다." },
    };
  },
});

export const deletePartner = mutation({
  args: {
    callerRole: v.string(),
    callerOrgId: v.number(),
    idOrCode: v.string(),
  },
  handler: async (ctx, args) => {
    const [orgs, users, projects, contracts] = await Promise.all([
      ctx.db.query("organizations").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("projects").collect(),
      ctx.db.query("contracts").collect(),
    ]);

    const org = findPartnerOrg(orgs, args.idOrCode);
    if (!org) {
      return { ok: false, status: 404, error: "삭제할 파트너 정보를 찾을 수 없습니다." };
    }

    const targetOrgId = Number(org.orgId);
    if (args.callerRole === "partner" && Number(org.parentId) !== args.callerOrgId) {
      return { ok: false, status: 403, error: "소속 직속 하위 파트너만 삭제할 수 있습니다." };
    }

    const childCount = orgs.filter((o) => Number(o.parentId) === targetOrgId).length;
    if (childCount > 0) {
      return {
        ok: false,
        status: 400,
        error: `직속 하위 2차 파트너(${childCount}개사)가 등록되어 있어 삭제할 수 없습니다. 하위 파트너를 먼저 삭제하거나 상위 파트너를 변경해 주세요.`,
      };
    }

    const orgProjects = projects.filter(
      (pr) => Number(pr.orgId) === targetOrgId || pr.partnerName === org.name
    );
    const projectIdSet = new Set(orgProjects.map((pr) => pr.projectId));
    const ctCount = contracts.filter((ct) => projectIdSet.has(ct.projectId)).length;

    if (orgProjects.length > 0 || ctCount > 0) {
      return {
        ok: false,
        status: 400,
        error: `해당 파트너에 등록된 고객(${orgProjects.length}건) 또는 계약(${ctCount}건) 실적 데이터가 존재하여 삭제할 수 없습니다.`,
      };
    }

    const linkedUsers = users.filter(
      (u) => Number(u.orgId) === targetOrgId && u.role === "partner"
    );
    for (const u of linkedUsers) {
      await ctx.db.delete(u._id);
    }
    await ctx.db.delete(org._id);

    return {
      ok: true,
      status: 200,
      data: {
        success: true,
        deletedId: targetOrgId,
        deletedName: org.name,
        message: `[${org.name}] 파트너 및 관련 어드민 계정이 정상적으로 삭제되었습니다.`,
      },
    };
  },
});
