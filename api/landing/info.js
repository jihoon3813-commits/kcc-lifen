import { api } from "../../convex/_generated/api.js";
import { convexClient, setCors } from "../_lib/authHelper.js";

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const rawPartner = req.query?.partner ? String(req.query.partner).trim() : undefined;
  const rawCh = (req.query?.ch || req.query?.link) ? String(req.query.ch || req.query.link).trim() : undefined;

  try {
    const [info, prodData] = await Promise.all([
      convexClient.query(api.landing.getInfo, { partner: rawPartner, ch: rawCh }),
      rawCh ? convexClient.query(api.crm.listProductsAndLinks, {}).catch(() => null) : Promise.resolve(null),
    ]);

    const matchedLink = rawCh && prodData?.landingLinks
      ? prodData.landingLinks.find((l) => String(l.code || "").trim().toLowerCase() === rawCh.toLowerCase())
      : null;

    const resolvedPartner =
      info?.partner ||
      (matchedLink?.partnerName && matchedLink.partnerName !== "직영"
        ? { name: matchedLink.partnerName }
        : null);

    return res.status(200).json({
      brand: info?.brand || "KCC 홈씨씨 창호 렌탈",
      company: info?.company || "(주)라이프앤조이",
      tel: info?.tel || "1588-0883",
      partner: resolvedPartner,
      link: matchedLink ? { code: matchedLink.code, channel: matchedLink.channel, name: matchedLink.name } : null,
      channel: matchedLink?.channel || info?.channel || rawCh || "기본 랜딩",
    });
  } catch (err) {
    console.error("Vercel GET /api/landing/info error:", err);
    return res.status(200).json({
      brand: "KCC 홈씨씨 창호 렌탈",
      company: "(주)라이프앤조이",
      tel: "1588-0883",
      partner: rawPartner && rawPartner !== "직영" ? { name: rawPartner } : null,
      link: null,
      channel: rawCh || "기본 랜딩",
    });
  }
}
