export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const { partner, ch } = req.query || {};

  return res.status(200).json({
    brand: "KCC 홈씨씨 창호 렌탈",
    company: "(주)라이프앤조이",
    tel: "1588-0883",
    partner: partner && partner !== "직영" ? { name: partner } : null,
    link: null,
    channel: ch || "기본 랜딩"
  });
}
