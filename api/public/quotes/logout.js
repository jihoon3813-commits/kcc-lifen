import { setCors } from "../../_lib/authHelper.js";
import { clearCustomerSessionCookie } from "../../_lib/publicQuoteHelper.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  clearCustomerSessionCookie(res, req);
  return res.json({ success: true });
}
