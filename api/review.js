// AI Code Review API — powered by Conway inference
const WALLET = "0xFA214C4F602d85ba5DbCCfCb6033C6b0a0bBCb7B";
const FREE_PER_DAY = 3;

if (!global._reviews) global._reviews = {};
if (!global._usage) global._usage = new Map();

function checkLimit(ip) {
  const key = `${ip}:${new Date().toISOString().split("T")[0]}`;
  const n = (global._usage.get(key) || 0) + 1;
  if (n > FREE_PER_DAY) return false;
  global._usage.set(key, n);
  return true;
}

async function doReview(code, language) {
  const apiKey = process.env.CONWAY_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = process.env.CONWAY_API_KEY ? "https://inference.conway.tech" : "https://api.openai.com";
  const r = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `You are an expert ${language} code reviewer. Respond ONLY in this exact JSON:\n{"score":<1-10>,"summary":"<one sentence>","issues":[{"severity":"high|medium|low","line":<num|null>,"issue":"<desc>","fix":"<how>"}],"positives":["<what works>"],"refactored":"<improved snippet if score<7 else null>"}` },
        { role: "user", content: `Review this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\`` }
      ],
      max_tokens: 1500, temperature: 0.2, response_format: { type: "json_object" }
    })
  });
  if (!r.ok) throw new Error(`Inference error ${r.status}: ${await r.text()}`);
  const d = await r.json();
  return JSON.parse(d.choices[0].message.content);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Paid-Key");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { code, language = "javascript" } = req.body || {};
  if (!code) return res.status(400).json({ error: "code field required" });
  if (code.length > 10000) return res.status(400).json({ error: "Max 10000 chars" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  const paidKey = req.headers["x-paid-key"] || req.body?.api_key;
  const isPaid = paidKey && paidKey.length >= 16;

  if (!isPaid && !checkLimit(ip)) {
    return res.status(429).json({
      error: `Free limit: ${FREE_PER_DAY} reviews/day`,
      upgrade: "Send 5 USDC/month on Base network for unlimited",
      wallet: WALLET, network: "Base (Ethereum L2)"
    });
  }

  try {
    const review = await doReview(code, language);
    const id = Math.random().toString(36).slice(2, 10);
    const host = req.headers.host || "ai-code-review-api.vercel.app";
    const baseUrl = `https://${host}`;
    global._reviews[id] = { review, language, ts: new Date().toISOString() };
    const keys = Object.keys(global._reviews);
    if (keys.length > 1000) delete global._reviews[keys[0]];

    return res.status(200).json({
      review,
      share_url: `${baseUrl}/r/${id}`,
      tier: isPaid ? "paid" : "free",
      upgrade: isPaid ? undefined : { wallet: WALLET, price_usdc: 5, network: "Base" }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
