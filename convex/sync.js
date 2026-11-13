import { mutation, internalMutation } from "./_generated/server.js";
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

const PRESERVED_RENTAL_FIELDS_JSON = JSON.stringify([
  {"id":"f_date_p1_ie2q","key":"date","label":"날짜","page":1,"x":16.9,"y":90.1,"w":18.5,"h":2.3,"fontSize":14,"fontWeight":"normal","color":"#1a202c","align":"center","format":"YYYY년 MM월 DD일","enabled":true},
  {"id":"f_name_p1_mxle","key":"name","label":"성명","page":1,"x":46.4,"y":90.3,"w":13.6,"h":1.7,"fontSize":15,"fontWeight":"bold","color":"#1a202c","align":"center","enabled":true},
  {"id":"f_signature_p1_4ury","key":"signature","label":"서명","page":1,"x":56.6,"y":89.9,"w":14.5,"h":2.7,"fontSize":14,"fontWeight":"normal","color":"#1a202c","align":"center","enabled":true},
  {"id":"f_birthDate_p1_ax34","key":"birthDate","label":"생년월일","page":1,"x":75.1,"y":90,"w":16.4,"h":2.5,"fontSize":14,"fontWeight":"normal","color":"#1a202c","align":"center","format":"YYYY-MM-DD","enabled":true},
  {"id":"f_phone_p1_kxkh","key":"phone","label":"연락처","page":1,"x":46.2,"y":92.3,"w":20.7,"h":2.1,"fontSize":14,"fontWeight":"normal","color":"#1a202c","align":"center","enabled":true},
  {"id":"f_name_p2_mwd9gsl8_m6d","key":"name","label":"성명","page":2,"x":62,"y":83.2,"w":16,"h":3.6,"fontSize":15,"fontWeight":"bold","color":"#1a202c","align":"center","enabled":true},
  {"id":"f_signature_p2_mwd9gtkp_cd4","key":"signature","label":"서명","page":2,"x":78.5,"y":81.2,"w":16,"h":6.8,"fontSize":14,"fontWeight":"normal","color":"#1a202c","align":"center","enabled":true},
  {"id":"f_name_p3_mwd9h1yq_v6u","key":"name","label":"성명","page":3,"x":62,"y":83.2,"w":16,"h":3.6,"fontSize":15,"fontWeight":"bold","color":"#1a202c","align":"center","enabled":true},
  {"id":"f_signature_p3_mwd9h2qx_bb8","key":"signature","label":"서명","page":3,"x":78.5,"y":81.2,"w":16,"h":6.8,"fontSize":14,"fontWeight":"normal","color":"#1a202c","align":"center","enabled":true},
  {"id":"f_date_p3_mwd9h3r9_z2i","key":"date","label":"날짜","page":3,"x":58,"y":78.5,"w":32,"h":3.6,"fontSize":14,"fontWeight":"normal","color":"#1a202c","align":"center","format":"YYYY년 MM월 DD일","enabled":true}
]);

// 8. 운영 데이터 클린 초기화 내부 뮤테이션 (관리자 CLI/대시보드 전용)
export const resetOperationalData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const wipeTables = [
      "customers",
      "projects",
      "quotes",
      "quoteItems",
      "contracts",
      "rentalApplications",
      "consultations",
      "customerConsultRequests",
      "appSettings",
    ];

    const deleted = {};
    for (const table of wipeTables) {
      let count = 0;
      for await (const doc of ctx.db.query(table)) {
        await ctx.db.delete(doc._id);
        count++;
      }
      deleted[table] = count;
    }

    // 조직: 본사(hq) 1건('라이프앤조이')만 유지하고 파트너 조직 전체 삭제
    let orgDeleted = 0;
    let hqDoc = null;
    for await (const org of ctx.db.query("organizations")) {
      if (org.type === "hq" && org.name === "라이프앤조이" && !hqDoc) {
        hqDoc = org;
      } else {
        await ctx.db.delete(org._id);
        orgDeleted++;
      }
    }
    const nowIso = new Date().toISOString();
    const hqPayload = {
      name: "라이프앤조이",
      type: "hq",
      code: "HQ001",
      phone: "1588-0000",
      address: "서울 강남구 역삼동",
      createdAt: hqDoc?.createdAt || nowIso,
    };
    if (hqDoc) {
      await ctx.db.patch(hqDoc._id, hqPayload);
    } else {
      await ctx.db.insert("organizations", hqPayload);
    }
    deleted.organizations = orgDeleted;

    // 사용자: admin(김지훈) 1건만 유지하고 나머지 계정 전체 삭제
    let userDeleted = 0;
    let adminDoc = null;
    for await (const u of ctx.db.query("users")) {
      if (u.username === "admin" && !adminDoc) {
        adminDoc = u;
      } else {
        await ctx.db.delete(u._id);
        userDeleted++;
      }
    }
    const adminPayload = {
      username: "admin",
      passwordHash: "$2b$10$0zLjDlV8Q4y6X8xa3WLdB.lBX.E1BaBN4M3JlFwWlVr96sj2e2D26",
      name: "김지훈",
      phone: "010-1111-2222",
      email: "admin@example.com",
      role: "hq_admin",
      allowedMenus: JSON.stringify(["customers", "quotes", "contracts", "products", "partners", "stats", "settings"]),
      active: true,
      createdAt: adminDoc?.createdAt || nowIso,
    };
    if (adminDoc) {
      await ctx.db.patch(adminDoc._id, adminPayload);
    } else {
      await ctx.db.insert("users", adminPayload);
    }
    deleted.users = userDeleted;

    // 동의서 양식: rental_privacy(v7) 1건만 유지
    let formDeleted = 0;
    let rentalFormDoc = null;
    for await (const f of ctx.db.query("consentForms")) {
      if (f.formId === "rental_privacy" && !rentalFormDoc) {
        rentalFormDoc = f;
      } else {
        await ctx.db.delete(f._id);
        formDeleted++;
      }
    }
    const formPayload = {
      formId: "rental_privacy",
      name: "(렌탈) 개인정보 동의서",
      type: "rental",
      pdfPath: "/uploads/forms/form_1794469868135_ctjfux.pdf",
      fileName: "BSON_제휴영업팀 신용정보동의서_에디터용.pdf",
      fieldsConfigJson: PRESERVED_RENTAL_FIELDS_JSON,
      version: 7,
      enabled: true,
      createdAt: rentalFormDoc?.createdAt || nowIso,
      updatedAt: nowIso,
    };
    if (rentalFormDoc) {
      await ctx.db.patch(rentalFormDoc._id, formPayload);
    } else {
      await ctx.db.insert("consentForms", formPayload);
    }
    deleted.consentForms = formDeleted;

    return {
      ok: true,
      deleted,
      preserved: {
        organizations: 1,
        users: 1,
        consentForms: 1,
      },
    };
  },
});

// 9. 고객·공사·상담·견적·계약·렌탈 데이터만 전체 삭제 (계정/조직/설정/양식은 유지)
export const clearCustomerData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "customers",
      "projects",
      "consultations",
      "quotes",
      "quoteItems",
      "quoteViews",
      "quoteDispatches",
      "contracts",
      "rentalApplications",
      "customerConsultRequests",
      "auditLogs",
      "landingEvents",
    ];
    const deleted = {};
    for (const table of tables) {
      let count = 0;
      for await (const doc of ctx.db.query(table)) {
        await ctx.db.delete(doc._id);
        count++;
      }
      deleted[table] = count;
    }
    return { ok: true, deleted };
  },
});
