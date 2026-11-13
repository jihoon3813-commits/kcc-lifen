import multer from "multer";
import { setCors, authenticateRequest } from "../_lib/authHelper.js";
import { parseEstimateFile } from "../../server/utils/excelParser.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

function runUpload(req, res) {
  return new Promise((resolve, reject) => {
    upload.single("file")(req, res, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({ error: "로그인이 필요하거나 세션이 만료되었습니다." });
  }

  try {
    await runUpload(req, res);

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: "업로드할 엑셀/CSV 파일을 선택해 주세요." });
    }

    const parsed = parseEstimateFile(req.file.buffer, req.file.originalname || "estimate.xlsx");

    return res.status(200).json({
      success: true,
      data: parsed,
    });
  } catch (err) {
    console.error("Vercel quote parse-file error:", err);
    return res.status(400).json({
      error: err?.message || "파일 파싱에 실패했습니다.",
    });
  }
}
