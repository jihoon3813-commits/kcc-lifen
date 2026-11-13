import { mutation, query } from "./_generated/server.js";
import { v } from "convex/values";

// 1. 랜딩페이지 상담 신청 접수
export const submitConsultation = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    region: v.string(),
    district: v.optional(v.string()),
    apartment: v.optional(v.string()),
    size: v.optional(v.string()),
    scope: v.optional(v.string()),
    purpose: v.optional(v.string()),
    partner: v.optional(v.string()),
    ch: v.optional(v.string()),
    utm_source: v.optional(v.string()),
    utm_medium: v.optional(v.string()),
    utm_campaign: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanName = args.name.trim();
    const rawDigits = args.phone.replace(/\D/g, "");
    const cleanPhone = rawDigits.length === 11
      ? `${rawDigits.slice(0, 3)}-${rawDigits.slice(3, 7)}-${rawDigits.slice(7)}`
      : `${rawDigits.slice(0, 3)}-${rawDigits.slice(3, 6)}-${rawDigits.slice(6)}`;
    const cleanRegion = args.region.trim();

    const addressParts = [cleanRegion];
    if (args.district && args.district.trim()) addressParts.push(args.district.trim());
    if (args.apartment && args.apartment.trim()) addressParts.push(args.apartment.trim());
    const fullAddress = addressParts.join(" ");

    const now = new Date().toISOString();
    const isMeasure = args.purpose === "measure";
    const purposeLabel = isMeasure ? "무료 방문실측 예약" : "월 납입금 견적상담";

    // 1-1. 중복 접수 체크 (최근 60초 이내 동일 전화번호)
    const sixtySecAgo = new Date(Date.now() - 60000).toISOString();
    const recentProjects = await ctx.db
      .query("projects")
      .withIndex("by_customerPhone", (q) => q.eq("customerPhone", cleanPhone))
      .collect();

    const recent = recentProjects.find((p) => (p.createdAt || "") >= sixtySecAgo);
    if (recent) {
      return {
        success: true,
        alreadySubmitted: true,
        receiptId: recent.projectId,
        customerName: cleanName,
        phone: cleanPhone,
        purpose: purposeLabel,
        partnerName: recent.partnerName || "직영",
        channel: recent.source || "기본 랜딩(직접유입)",
        campaign: args.utm_campaign || "",
        message: "이미 상담 신청이 접수되었습니다. 담당자가 순차적으로 연락드리겠습니다.",
      };
    }

    // 1-2. 고객 정보 조회 및 생성/업데이트
    const existingCustomer = await ctx.db
      .query("customers")
      .withIndex("by_phone", (q) => q.eq("phone", cleanPhone))
      .first();

    if (existingCustomer) {
      await ctx.db.patch(existingCustomer._id, {
        name: cleanName,
        address: fullAddress.length > (existingCustomer.address?.length || 0) ? fullAddress : existingCustomer.address,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("customers", {
        name: cleanName,
        phone: cleanPhone,
        address: fullAddress,
        marketingAgreed: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 1-3. 다음 프로젝트 ID 채번 (최대값 + 1, 최소 3101)
    const allProjects = await ctx.db.query("projects").collect();
    let maxId = 3100;
    for (const p of allProjects) {
      if (p.projectId && p.projectId > maxId) {
        maxId = p.projectId;
      }
    }
    const nextProjectId = maxId + 1;

    // 파트너명 및 유입 채널 결정
    const partnerName = args.partner && args.partner !== "직영" ? args.partner : "직영";
    let channel = "기본 랜딩(직접유입)";
    if (args.utm_source) {
      channel = args.utm_source;
    } else if (args.ch) {
      channel = args.ch;
    } else if (partnerName !== "직영") {
      channel = "파트너 전용링크";
    }
    const campaign = args.utm_campaign || "";
    const channelDisplay = campaign ? `${channel} (${campaign})` : channel;

    const noteLines = [
      `[랜딩페이지 온라인 접수]`,
      `• 유입 광고채널: ${channelDisplay}`,
      `• 신청 유형: ${purposeLabel}`,
      `• 고객 성함: ${cleanName}`,
      `• 연락처: ${cleanPhone}`,
      `• 설치 지역: ${fullAddress}`,
      `• 희망 평형: ${args.size || "미선택 / 상담 후 결정"}`,
      `• 교체 공간: ${args.scope || "미선택 / 전체 상담"}`
    ];
    if (partnerName !== "직영") {
      noteLines.push(`• 귀속 파트너: ${partnerName}`);
    }
    const noteText = noteLines.join("\n");

    // 1-4. projects 테이블 삽입
    await ctx.db.insert("projects", {
      projectId: nextProjectId,
      customerName: cleanName,
      customerPhone: cleanPhone,
      customerAddress: fullAddress,
      title: `${cleanName} 고객 창호 ${isMeasure ? "실측예약" : "렌탈상담"}`,
      product: "창호",
      status: "신규접수",
      label: isMeasure ? "실측요청" : "상담요청",
      source: channel,
      partnerName: partnerName,
      ownerName: "미배정",
      note: noteText,
      createdAt: now,
      updatedAt: now,
    });

    // 1-5. consultations 메모 삽입
    await ctx.db.insert("consultations", {
      projectId: nextProjectId,
      authorName: "랜딩시스템",
      type: "notes",
      content: `${purposeLabel} 온라인 접수 완료\n유입 채널: ${channelDisplay}\n지역: ${fullAddress}\n희망평형: ${args.size || "미정"}\n희망공간: ${args.scope || "미정"}`,
      isImportant: true,
      createdAt: now,
    });

    // 1-6. customerConsultRequests 삽입
    await ctx.db.insert("customerConsultRequests", {
      name: cleanName,
      phone: cleanPhone,
      address: fullAddress,
      product: "창호",
      status: "신규접수",
      source: channelDisplay,
      createdAt: now,
    });

    return {
      success: true,
      receiptId: nextProjectId,
      customerName: cleanName,
      phone: cleanPhone,
      purpose: purposeLabel,
      partnerName,
      channel,
      campaign,
      message: "상담 신청이 성공적으로 접수되었습니다. 담당자가 빠른 시일 내에 연락드리겠습니다.",
    };
  },
});

// 2. 기본 정보 조회
export const getInfo = query({
  args: {
    partner: v.optional(v.string()),
    ch: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let partnerObj = null;
    if (args.partner && args.partner !== "직영") {
      const org = await ctx.db
        .query("organizations")
        .withIndex("by_name", (q) => q.eq("name", args.partner))
        .first();
      if (org) {
        partnerObj = {
          name: org.name,
          code: org.code,
          phone: org.phone,
        };
      }
    }

    return {
      brand: "KCC 홈씨씨 창호 렌탈",
      company: "(주)라이프앤조이",
      tel: "1588-0883",
      partner: partnerObj || (args.partner && args.partner !== "직영" ? { name: args.partner } : null),
      channel: args.ch || "기본 랜딩",
    };
  },
});
