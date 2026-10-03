// Vercel serverless function: shared leaderboard for every player on every device.
//   GET  /api/scores            -> { scores:[...top 10], ttl:<seconds until auto-reset> }
//   POST /api/scores  {n,b,g,s} -> saves the player's best score
// Storage: Upstash Redis / Vercel KV (env vars KV_REST_API_URL + KV_REST_API_TOKEN).
// The whole leaderboard key expires 3 days after the first score is written; then it starts fresh.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const KEY = "arena:scores";
const TTL_SECONDS = 3 * 24 * 60 * 60; // 3 days
const MAX_SCORE = 1500;

// Keep these two lists in sync with arena.js
const BRANCHES = ["Computer", "IT", "EXTC", "Electronics", "Production", "Civil", "Textile", "Mechanical", "Electrical", "Diploma", "Masters"];
const GAMES = ["caesar", "memory", "domain", "phish", "password", "packet"];

async function redis(commands) {
  const r = await fetch(URL_ + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  const j = await r.json();
  if (!Array.isArray(j)) throw new Error("bad response");
  return j.map((x) => {
    if (x.error) throw new Error(x.error);
    return x.result;
  });
}

function parseBody(req) {
  let b = req.body;
  if (typeof b === "string") {
    try { b = JSON.parse(b); } catch (e) { b = null; }
  }
  return b && typeof b === "object" ? b : null;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!URL_ || !TOKEN) return res.status(500).json({ error: "Storage is not configured" });

  try {
    if (req.method === "GET") {
      const [flat, ttl] = await redis([["HGETALL", KEY], ["TTL", KEY]]);
      const scores = [];
      for (let i = 1; i < (flat || []).length; i += 2) {
        try { scores.push(JSON.parse(flat[i])); } catch (e) {}
      }
      scores.sort((a, b) => b.s - a.s || a.t - b.t);
      return res.status(200).json({ scores: scores.slice(0, 10), ttl: ttl > 0 ? ttl : null });
    }

    if (req.method === "POST") {
      const b = parseBody(req);
      if (!b) return res.status(400).json({ error: "bad body" });
      const n = String(b.n || "").trim().slice(0, 30);
      const br = String(b.b || "");
      const g = String(b.g || "");
      const s = Math.round(Number(b.s));
      if (n.length < 2 || !BRANCHES.includes(br) || !GAMES.includes(g) || !Number.isFinite(s) || s < 0 || s > MAX_SCORE) {
        return res.status(400).json({ error: "invalid entry" });
      }
      if (s === 0) return res.status(200).json({ ok: true, saved: false });

      const field = (n + "|" + br).toLowerCase();
      const [old] = await redis([["HGET", KEY, field]]);
      let prev = null;
      try { prev = old ? JSON.parse(old) : null; } catch (e) {}
      if (prev && prev.s >= s) return res.status(200).json({ ok: true, saved: false });

      const [, ttl] = await redis([["HSET", KEY, field, JSON.stringify({ n, b: br, g, s, t: Date.now() })], ["TTL", KEY]]);
      // First write into an empty leaderboard starts the 3-day countdown.
      if (ttl < 0) await redis([["EXPIRE", KEY, TTL_SECONDS]]);
      return res.status(200).json({ ok: true, saved: true });
    }

    return res.status(405).json({ error: "method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: "storage error" });
  }
};