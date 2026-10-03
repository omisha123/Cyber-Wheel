// Vercel serverless function: clears the leaderboard.
// Needs the ARENA_ADMIN_KEY environment variable; the caller sends it in the x-admin-key header.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  const admin = process.env.ARENA_ADMIN_KEY;
  if (!admin || req.headers["x-admin-key"] !== admin) return res.status(403).json({ error: "forbidden" });
  if (!URL_ || !TOKEN) return res.status(500).json({ error: "Storage is not configured" });
  try {
    const r = await fetch(URL_, {
      method: "POST",
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(["DEL", "arena:scores"]),
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "storage error" });
  }
};