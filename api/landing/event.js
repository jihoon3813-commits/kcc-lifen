import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api.js";

const CONVEX_URL = process.env.CONVEX_URL || "https://savory-hedgehog-927.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    await client.mutation(api.crm.recordLandingEvent, {
      eventType: String(body.event_type || "page_view"),
      productName: body.product_name ? String(body.product_name) : "KCC 홈씨씨 창호",
      channel: body.ch ? String(body.ch) : (body.utm_source ? String(body.utm_source) : undefined),
      partnerName: body.partner ? String(body.partner) : "직영",
      campaignName: body.utm_campaign ? String(body.utm_campaign) : undefined,
      utmSource: body.utm_source ? String(body.utm_source) : undefined,
      utmMedium: body.utm_medium ? String(body.utm_medium) : undefined,
      utmCampaign: body.utm_campaign ? String(body.utm_campaign) : undefined,
    });
  } catch (err) {
    console.error("Landing event record error:", err);
  }

  return res.status(200).json({ success: true });
}
