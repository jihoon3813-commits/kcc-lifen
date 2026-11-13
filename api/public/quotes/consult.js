import jwt from "jsonwebtoken";
import { api } from "../../../convex/_generated/api.js";
import { convexClient, JWT_SECRET, parseBody, setCors } from "../../_lib/authHelper.js";
import { resolveCustomerViewer } from "../../_lib/publicQuoteHelper.js";
import { notifyNewQuoteInquiry } from "../../_lib/discordHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = parseBody(req);
  if (!body) {
    return res.status(400).json({ error: "잘못된 요청 형식입니다." });
  }

  const {
    token,
    viewerToken,
    planSummary = "",
    topics = [],
    preferredTime = "상관없음",
    memo = "",
  } = body;

  let accessToken = "";
  const cookieViewer = resolveCustomerViewer(req);
  if (cookieViewer) {
    accessToken = cookieViewer.decoded.accessToken;
  } else if (viewerToken) {
    try {
      const decoded = jwt.verify(viewerToken, JWT_SECRET);
      if (decoded.scope === "customer_quote_viewer" && decoded.accessToken) {
        accessToken = decoded.accessToken;
      }
    } catch {
      return res.status(401).json({
        error: "로그인 세션이 만료되었습니다. 다시 본인확인 로그인을 진행해 주세요.",
      });
    }
  } else if (token) {
    accessToken = String(token).trim();
  }

  if (!accessToken) {
    return res.status(404).json({ error: "유효한 견적 정보를 확인할 수 없습니다." });
  }

  try {
    const bundle = await convexClient.query(api.quotes.getPublicBundleByToken, {
      accessToken,
    });
    if (!bundle) {
      return res.status(404).json({ error: "유효한 견적 정보를 확인할 수 없습니다." });
    }

    const safeTopics = Array.isArray(topics)
      ? topics.map((t) => String(t).trim()).filter(Boolean).slice(0, 10)
      : [];
    const safeTime = ["오전", "오후", "상관없음"].includes(preferredTime)
      ? preferredTime
      : "상관없음";
    const safeMemo = String(memo || "").trim().slice(0, 500);
    const safePlan = String(planSummary || "").trim().slice(0, 200);

    await convexClient.mutation(api.quotes.recordPublicConsultRequest, {
      projectId: bundle.project.projectId,
      customerName: bundle.project.customerName,
      customerPhone: bundle.project.customerPhone,
      product: bundle.project.product || "창호",
      address: bundle.project.customerAddress || "",
      planSummary: safePlan,
      topics: safeTopics,
      preferredTime: safeTime,
      memo: safeMemo,
    });

    await notifyNewQuoteInquiry({
      projectId: bundle.project.projectId,
      customerName: bundle.project.customerName,
      phone: bundle.project.customerPhone,
      product: bundle.project.product || "창호",
      topics: safeTopics,
      preferredTime: safeTime,
      planSummary: safePlan,
      memo: safeMemo,
    });

    return res.status(201).json({
      success: true,
      message: "상담 요청이 정상 접수되었습니다. 담당자가 확인 후 연락드리겠습니다.",
    });
  } catch (err) {
    console.error("[Vercel Convex] POST /api/public/quotes/consult error:", err);
    return res.status(500).json({ error: "상담 요청 접수 중 오류가 발생했습니다." });
  }
}
