import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server.js";
import { api } from "./_generated/api.js";

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Bridge-Secret",
};

// 1. Preflight OPTIONS
http.route({
  path: "/api/landing/submit",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/landing/event",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/landing/info",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

// 2. Submit consultation
http.route({
  path: "/api/landing/submit",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.json();
      const {
        name, phone, region, district, apartment,
        size, scope, purpose, partner, ch,
        utm_source, utm_medium, utm_campaign
      } = body || {};

      if (!name || String(name).trim().length < 2) {
        return new Response(JSON.stringify({ error: "성함을 두 글자 이상 입력해 주세요." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rawDigits = String(phone || "").replace(/\D/g, "");
      if (!/^01[016789]\d{7,8}$/.test(rawDigits)) {
        return new Response(JSON.stringify({ error: "올바른 휴대전화 번호를 입력해 주세요." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!region || !String(region).trim()) {
        return new Response(JSON.stringify({ error: "설치 지역을 선택해 주세요." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await ctx.runMutation(api.landing.submitConsultation, {
        name: String(name),
        phone: String(phone),
        region: String(region),
        district: district ? String(district) : undefined,
        apartment: apartment ? String(apartment) : undefined,
        size: size ? String(size) : undefined,
        scope: scope ? String(scope) : undefined,
        purpose: purpose ? String(purpose) : "cost",
        partner: partner ? String(partner) : undefined,
        ch: ch ? String(ch) : undefined,
        utm_source: utm_source ? String(utm_source) : undefined,
        utm_medium: utm_medium ? String(utm_medium) : undefined,
        utm_campaign: utm_campaign ? String(utm_campaign) : undefined,
      });

      if (!result?.alreadySubmitted) {
        const webhookUrl =
          "https://discordapp.com/api/webhooks/1570707391845240925/iOsaiN4YEZLrVRIlNNN1k1fZvIKTmm3j9IGdQnKGSXVTnRV4K999UeSKbWXYYK0YEV6R";
        const addr = [region, district, apartment, size ? `${size}평` : ""]
          .map((s) => String(s || "").trim())
          .filter(Boolean)
          .join(" ");
        try {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              embeds: [
                {
                  title: `👤 [고객관리] ${purpose === "measure" ? "무료 방문실측 예약" : "월 납입금 견적상담"}`,
                  color: 0x2563eb,
                  fields: [
                    { name: "고객명", value: String(result?.customerName || name), inline: true },
                    { name: "연락처", value: String(phone), inline: true },
                    { name: "접수번호", value: result?.receiptId ? `#${result.receiptId}` : "-", inline: true },
                    { name: "관심 상품", value: scope ? String(scope) : "창호", inline: true },
                    { name: "유입 경로(채널)", value: String(result?.channel || ch || utm_source || "기본 랜딩(직접유입)"), inline: true },
                    { name: "소속 / 파트너", value: String(result?.partnerName || partner || "직영"), inline: true },
                    { name: "설치 지역 / 주소", value: addr || "-", inline: false },
                  ],
                  timestamp: new Date().toISOString(),
                },
              ],
            }),
            signal: AbortSignal.timeout(2500),
          });
        } catch (hookErr) {
          console.warn("Convex HTTP Discord webhook error:", hookErr);
        }
      }

      return new Response(JSON.stringify(result), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Convex HTTP submit error:", err);
      return new Response(JSON.stringify({ error: "상담 접수 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }),
});

// 3. Landing event logger
http.route({
  path: "/api/landing/event",
  method: "POST",
  handler: httpAction(async () => {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

// 4. Landing info
http.route({
  path: "/api/landing/info",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const partner = url.searchParams.get("partner") || undefined;
    const ch = url.searchParams.get("ch") || undefined;

    const info = await ctx.runQuery(api.landing.getInfo, { partner, ch });
    return new Response(JSON.stringify(info), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

// 5. Daangn Lead Form Webhook (당근마켓 > 상담리드 자동 등록)
http.route({
  path: "/api/landing/daangn-lead",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/landing/daangn-lead",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.json();
      const rawRows = Array.isArray(body?.rows)
        ? body.rows
        : Array.isArray(body)
          ? body
          : body?.row && typeof body.row === "object"
            ? [body.row]
            : [body || {}];

      const existingData = await ctx.runQuery(api.crm.listCustomersData, {});
      const existingPhones = new Set(
        (existingData?.projects || []).map((p) => String(p.customerPhone || "").replace(/\D/g, ""))
      );

      const inserted = [];
      const skipped = [];

      for (const r of rawRows) {
        let obj = r || {};
        if (Array.isArray(r?.headers) && Array.isArray(r?.values)) {
          obj = {};
          r.headers.forEach((h, idx) => {
            obj[String(h || `col_${idx + 1}`).trim()] = r.values[idx] ?? "";
          });
        }

        const rawPhone =
          obj.phone || obj["연락처"] || obj["전화번호"] || obj["휴대폰"] || obj["휴대전화"] || "";
        let digits = String(rawPhone).replace(/\D/g, "");
        if (digits.startsWith("82") && digits.length >= 11) digits = "0" + digits.slice(2);
        else if (digits.startsWith("10") && (digits.length === 9 || digits.length === 10)) digits = "0" + digits;

        if (!/^01[016789]\d{7,8}$/.test(digits)) continue;

        const cleanPhone =
          digits.length === 11
            ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
            : `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;

        if (existingPhones.has(digits)) {
          skipped.push({ phone: cleanPhone, reason: "already_exists" });
          continue;
        }
        existingPhones.add(digits);

        const cleanName = String(
          obj.name || obj["이름"] || obj["성함"] || obj["고객명"] || "당근상담고객"
        ).trim();
        const cleanAddress = String(
          obj.address || obj.region || obj["지역"] || obj["주소"] || obj["설치지역"] || obj["시공지역"] || "지역 미기재 (상담 확인)"
        ).trim();
        const cleanNote = String(
          obj.note || obj.size || obj["평수"] || obj["평형"] || obj["문의사항"] || obj["메모"] || ""
        ).trim();
        const cleanProduct = String(obj.product || obj["상품"] || "창호").trim() || "창호";

        const created = await ctx.runMutation(api.crm.createCustomerProject, {
          name: cleanName,
          phone: cleanPhone,
          address: cleanAddress,
          product: cleanProduct,
          owner: "미배정",
          partner: "직영",
          orgId: 1,
          source: "당근마켓",
          adCampaign: "상담리드",
          note: cleanNote,
          authorName: "당근 리드폼",
        });

        inserted.push({
          projectId: created?.projectId,
          name: cleanName,
          phone: cleanPhone,
          address: cleanAddress,
          note: cleanNote,
        });

        const webhookUrl =
          "https://discordapp.com/api/webhooks/1570707391845240925/iOsaiN4YEZLrVRIlNNN1k1fZvIKTmm3j9IGdQnKGSXVTnRV4K999UeSKbWXYYK0YEV6R";
        try {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              embeds: [
                {
                  title: "👤 [고객관리] 당근마켓 > 상담리드 자동 접수",
                  color: 0xea580c,
                  fields: [
                    { name: "고객명", value: cleanName, inline: true },
                    { name: "연락처", value: cleanPhone, inline: true },
                    { name: "접수번호", value: created?.projectId ? `#${created.projectId}` : "-", inline: true },
                    { name: "관심 상품", value: cleanProduct, inline: true },
                    { name: "유입 경로(채널)", value: "당근마켓 (상담리드)", inline: true },
                    { name: "소속 / 파트너", value: "직영", inline: true },
                    { name: "설치 지역 / 주소", value: cleanAddress || "-", inline: false },
                    ...(cleanNote ? [{ name: "메모", value: cleanNote, inline: false }] : []),
                  ],
                  timestamp: new Date().toISOString(),
                },
              ],
            }),
            signal: AbortSignal.timeout(2500),
          });
        } catch (hookErr) {
          console.warn("Convex HTTP Daangn Discord webhook error:", hookErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          insertedCount: inserted.length,
          skippedCount: skipped.length,
          inserted,
          skipped,
        }),
        {
          status: inserted.length > 0 ? 201 : 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (err) {
      console.error("Convex HTTP Daangn webhook error:", err);
      return new Response(
        JSON.stringify({ error: "당근 리드폼 자동 등록 처리 중 오류가 발생했습니다." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }),
});

// 4. Phone SMS Bridge endpoints (compatible with sono-sms-bridge.apk)
const bridgeCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Bridge-Secret",
};

for (const bridgePath of ["/api/sms-bridge/poll", "/api/sms-bridge/ack", "/api/sms-bridge/sync"]) {
  http.route({
    path: bridgePath,
    method: "OPTIONS",
    handler: httpAction(async () => new Response(null, { status: 204, headers: bridgeCorsHeaders })),
  });
}

http.route({
  path: "/api/sms-bridge/poll",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.json().catch(() => ({}));
      const secret = String(req.headers.get("x-bridge-secret") || body?.secret || "").trim();
      const deviceName = typeof body?.deviceName === "string" ? body.deviceName.trim() : undefined;
      const appVersion = typeof body?.appVersion === "string" ? body.appVersion.trim() : undefined;
      const res = await ctx.runMutation(api.smsBridge.pollOutbox, {
        secret,
        deviceName,
        appVersion,
      });
      return new Response(JSON.stringify(res), {
        status: res.ok ? 200 : 401,
        headers: { ...bridgeCorsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ ok: false, error: err?.message || "Invalid request", jobs: [] }),
        { status: 400, headers: { ...bridgeCorsHeaders, "Content-Type": "application/json" } }
      );
    }
  }),
});

http.route({
  path: "/api/sms-bridge/ack",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.json().catch(() => ({}));
      const secret = String(req.headers.get("x-bridge-secret") || body?.secret || "").trim();
      const outboxId = String(body?.outboxId || "").trim();
      if (!outboxId) {
        return new Response(JSON.stringify({ ok: false, error: "outboxId is required" }), {
          status: 400,
          headers: { ...bridgeCorsHeaders, "Content-Type": "application/json" },
        });
      }
      const res = await ctx.runMutation(api.smsBridge.ackOutbox, {
        secret,
        outboxId,
        success: Boolean(body?.success),
        errorMessage: typeof body?.errorMessage === "string" ? body.errorMessage : undefined,
      });
      return new Response(JSON.stringify(res), {
        status: res.ok ? 200 : 401,
        headers: { ...bridgeCorsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ ok: false, error: err?.message || "Invalid request" }),
        { status: 400, headers: { ...bridgeCorsHeaders, "Content-Type": "application/json" } }
      );
    }
  }),
});

http.route({
  path: "/api/sms-bridge/sync",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.json().catch(() => ({}));
      const secret = String(req.headers.get("x-bridge-secret") || body?.secret || "").trim();
      const deviceName = typeof body?.deviceName === "string" ? body.deviceName.trim() : undefined;
      const items = Array.isArray(body?.items)
        ? body.items
        : Array.isArray(body?.messages)
          ? body.messages
          : [];
      const res = await ctx.runMutation(api.smsBridge.syncMessages, {
        secret,
        deviceName,
        count: items.length,
      });
      return new Response(JSON.stringify(res), {
        status: res.ok ? 200 : 401,
        headers: { ...bridgeCorsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ ok: false, synced: 0, error: err?.message || "Invalid request" }),
        { status: 400, headers: { ...bridgeCorsHeaders, "Content-Type": "application/json" } }
      );
    }
  }),
});

export default http;
