import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server.js";
import { api } from "./_generated/api.js";

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

export default http;
