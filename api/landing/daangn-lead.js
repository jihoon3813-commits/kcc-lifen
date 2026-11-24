import { convexClient, isProductionEnv, setCors, parseBody } from "../_lib/authHelper.js";
import {
  DEFAULT_DAANGN_SHEET_ID,
  DEFAULT_DAANGN_GID,
  fetchGoogleSheetRows,
  parseCsvToRowObjects,
  syncDaangnRowsToConvex,
} from "../_lib/daangnLeadHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    // GET: Pull directly from Google Sheet CSV and sync to Convex
    if (req.method === "GET") {
      const sheetId = req.query?.sheetId || DEFAULT_DAANGN_SHEET_ID;
      const gid = req.query?.gid || DEFAULT_DAANGN_GID;
      if (!isProductionEnv() && sheetId === DEFAULT_DAANGN_SHEET_ID) {
        return res.status(200).json({
          success: true,
          skippedInDev: true,
          insertedCount: 0,
          skippedCount: 0,
          inserted: [],
          skipped: [],
          message: "개발/프리뷰 서버에서는 운영 당근 리드 시트 자동 동기화가 비활성화되어 있습니다.",
        });
      }
      const rows = await fetchGoogleSheetRows(sheetId, gid);
      const result = await syncDaangnRowsToConvex(convexClient, rows);
      return res.status(200).json(result);
    }

    if (req.method === "POST") {
      const body = parseBody(req) || {};

      // Mode 1: Pull from Google Sheet by sheetId/gid
      if (body.action === "sync_sheet" || (!body.rows && !body.row && !body.headers && !body.csv && !body.phone && !body["연락처"] && !body["전화번호"])) {
        const sheetId = body.sheetId || req.query?.sheetId || DEFAULT_DAANGN_SHEET_ID;
        const gid = body.gid || req.query?.gid || DEFAULT_DAANGN_GID;
        if (!isProductionEnv() && sheetId === DEFAULT_DAANGN_SHEET_ID) {
          return res.status(200).json({
            success: true,
            skippedInDev: true,
            insertedCount: 0,
            skippedCount: 0,
            inserted: [],
            skipped: [],
            message: "개발/프리뷰 서버에서는 운영 당근 리드 시트 동기화가 비활성화되어 있습니다.",
          });
        }
        const rows = await fetchGoogleSheetRows(sheetId, gid);
        const result = await syncDaangnRowsToConvex(convexClient, rows, {
          partner: body.partner,
          owner: body.owner,
        });
        return res.status(200).json(result);
      }

      // Mode 2: Raw CSV text posted
      if (typeof body.csv === "string" && body.csv.trim()) {
        const rows = parseCsvToRowObjects(body.csv);
        const result = await syncDaangnRowsToConvex(convexClient, rows, {
          partner: body.partner,
          owner: body.owner,
        });
        return res.status(200).json(result);
      }

      // Mode 3: Array of rows or single row from Google Apps Script / Webhook
      let rawRows = [];
      if (Array.isArray(body.rows)) {
        rawRows = body.rows;
      } else if (Array.isArray(body)) {
        rawRows = body;
      } else if (body.row && typeof body.row === "object") {
        rawRows = [body.row];
      } else if (Array.isArray(body.headers) && Array.isArray(body.values)) {
        rawRows = [{ headers: body.headers, values: body.values }];
      } else {
        rawRows = [body];
      }

      const result = await syncDaangnRowsToConvex(convexClient, rawRows, {
        partner: body.partner,
        owner: body.owner,
      });
      return res.status(result.insertedCount > 0 ? 201 : 200).json(result);
    }

    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (err) {
    console.error("Daangn lead sync error:", err);
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      code: err.code || "SYNC_ERROR",
      error: err.message || "당근 리드폼 동기화 처리 중 오류가 발생했습니다.",
    });
  }
}
