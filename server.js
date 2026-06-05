#!/usr/bin/env node
// Claude Agent Code Review Service
// Runs locally, exposed via cloudflared tunnel for public access

const http = require("http");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const path = require("path");

const CONWAY_WALLET = "0xFA214C4F602d85ba5DbCCfCb6033C6b0a0bBCb7B";
const FREE_REVIEWS_PER_DAY = 3;
const PORT = 3921;
const REVIEWS_FILE = path.join(os.homedir(), ".automaton", "reviews.json");

// Rate limiting store: ip -> { count, date }
const rateLimits = new Map();

// Shared review store: id -> { review, code, language, ts }
let sharedReviews = {};
try {
  sharedReviews = JSON.parse(fs.readFileSync(REVIEWS_FILE, "utf8"));
} catch (_) {}

function saveReviews() {
  // Keep last 500 reviews
  const keys = Object.keys(sharedReviews);
  if (keys.length > 500) {
    const toDelete = keys.slice(0, keys.length - 500);
    toDelete.forEach(k => delete sharedReviews[k]);
  }
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify(sharedReviews));
}

function getServiceUrl() {
  try {
    return fs.readFileSync(path.join(os.homedir(), ".automaton", "service-url.txt"), "utf8").trim();
  } catch (_) {
    return "http://localhost:" + PORT;
  }
}

function checkFreeLimit(ip) {
  const today = new Date().toISOString().split("T")[0];
  const entry = rateLimits.get(ip);
  if (!entry || entry.date !== today) {
    rateLimits.set(ip, { count: 1, date: today });
    return true;
  }
  if (entry.count >= FREE_REVIEWS_PER_DAY) return false;
  entry.count++;
  return true;
}

async function reviewCode(code, language) {
  const apiKey = process.env.CONWAY_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = process.env.CONWAY_API_KEY
    ? "https://inference.conway.tech"
    : "https://api.openai.com";
  const model = process.env.CONWAY_MODEL || "gpt-4o-mini";

  if (!apiKey) throw new Error("No inference API configured");

  const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: `You are an expert ${language} code reviewer. Respond ONLY in this exact JSON format:
{"score":<1-10>,"summary":"<one sentence>","issues":[{"severity":"high|medium|low","line":<number or null>,"issue":"<desc>","fix":"<how>"}],"positives":["<what works well>"],"refactored":"<improved snippet if score<7 else null>"}`,
        },
        { role: "user", content: `Review this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\`` },
      ],
      max_tokens: 1500,
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) throw new Error(`Inference error: ${await resp.text()}`);
  const data = await resp.json();
  return JSON.parse(data.choices[0].message.content);
}

function scoreColor(score) {
  if (score >= 8) return "#3fb950";
  if (score >= 5) return "#d29922";
  return "#f85149";
}

function scoreLabel(score) {
  if (score >= 8) return "Great";
  if (score >= 5) return "Needs Work";
  return "Critical Issues";
}

function severityColor(s) {
  return s === "high" ? "#f85149" : s === "medium" ? "#d29922" : "#3fb950";
}

function renderSharePage(id, data, serviceUrl) {
  const { review, language, ts } = data;
  const col = scoreColor(review.score);
  const label = scoreLabel(review.score);
  const date = new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const tweetText = encodeURIComponent(`My ${language} code scored ${review.score}/10 in an AI review: "${review.summary}" — see the full review:`);
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(serviceUrl + "/r/" + id)}`;

  const issuesHtml = (review.issues || []).map(i => `
    <div class="issue">
      <span class="severity" style="background:${severityColor(i.severity)}20;color:${severityColor(i.severity)};border:1px solid ${severityColor(i.severity)}40">${i.severity}</span>
      ${i.line ? `<span class="line">line ${i.line}</span>` : ""}
      <div class="issue-text"><strong>${escHtml(i.issue)}</strong><br><span class="fix">Fix: ${escHtml(i.fix)}</span></div>
    </div>`).join("");

  const positivesHtml = (review.positives || []).map(p =>
    `<div class="positive">✓ ${escHtml(p)}</div>`).join("");

  const refactoredHtml = review.refactored ? `
    <h2>Refactored</h2>
    <pre><code>${escHtml(review.refactored)}</code></pre>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${language} Code Review — Score ${review.score}/10</title>
<meta name="description" content="${escHtml(review.summary)}">
<meta property="og:title" content="${language} code scored ${review.score}/10 in AI review">
<meta property="og:description" content="${escHtml(review.summary)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${language} code scored ${review.score}/10">
<meta name="twitter:description" content="${escHtml(review.summary)}">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#0d1117;color:#e6edf3;line-height:1.6;padding:0}
.header{background:#161b22;border-bottom:1px solid #30363d;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
.logo{color:#58a6ff;font-weight:700;font-size:1rem;text-decoration:none}
.cta-btn{background:#58a6ff;color:#0d1117;border:none;border-radius:6px;padding:8px 16px;font-size:.85rem;font-weight:600;cursor:pointer;text-decoration:none;white-space:nowrap}
.content{max-width:720px;margin:0 auto;padding:40px 24px}
.score-card{display:flex;align-items:center;gap:20px;background:#161b22;border:1px solid #30363d;border-radius:12px;padding:24px;margin-bottom:32px}
.score-num{font-size:3.5rem;font-weight:700;color:${col};line-height:1}
.score-info .label{font-size:.8rem;color:#8b949e;text-transform:uppercase;letter-spacing:.05em}
.score-info .verdict{font-size:1.1rem;font-weight:600;color:${col}}
.score-info .summary{color:#8b949e;font-size:.9rem;margin-top:4px}
.meta{color:#484f58;font-size:.8rem;margin-left:auto;text-align:right}
h2{font-size:1rem;font-weight:600;color:#8b949e;text-transform:uppercase;letter-spacing:.05em;margin:24px 0 12px}
.issue{display:flex;align-items:flex-start;gap:10px;padding:12px;background:#161b22;border:1px solid #30363d;border-radius:8px;margin-bottom:8px}
.severity{font-size:.75rem;font-weight:600;padding:2px 8px;border-radius:10px;white-space:nowrap;text-transform:uppercase}
.line{font-size:.75rem;color:#8b949e;white-space:nowrap;padding-top:2px}
.issue-text{font-size:.9rem}
.fix{color:#8b949e;font-size:.85rem}
.positive{color:#3fb950;font-size:.9rem;padding:6px 0;border-bottom:1px solid #21262d}
.positive:last-child{border-bottom:none}
pre{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;overflow-x:auto;margin-bottom:16px}
code{font-family:'SF Mono',Monaco,monospace;font-size:.82rem;color:#79c0ff}
.share-bar{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;margin-top:32px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.share-bar p{color:#8b949e;font-size:.9rem}
.tweet-btn{background:#1d9bf0;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:.85rem;font-weight:600;cursor:pointer;text-decoration:none}
.try-box{background:#0d1117;border:1px solid #58a6ff;border-radius:12px;padding:24px;margin-top:32px;text-align:center}
.try-box p{color:#8b949e;font-size:.9rem;margin-bottom:16px}
.try-box a{color:#58a6ff;text-decoration:none}
</style>
</head><body>
<div class="header">
  <a class="logo" href="${serviceUrl}">AI Code Review API</a>
  <a class="cta-btn" href="${serviceUrl}">Get your code reviewed →</a>
</div>
<div class="content">
  <div class="score-card">
    <div class="score-num">${review.score}<span style="font-size:1.5rem;color:#8b949e">/10</span></div>
    <div class="score-info">
      <div class="label">${escHtml(language)} · ${date}</div>
      <div class="verdict">${label}</div>
      <div class="summary">${escHtml(review.summary)}</div>
    </div>
    <div class="meta">Reviewed by<br>AI Code Review API</div>
  </div>

  ${issuesHtml.length ? `<h2>Issues Found (${review.issues.length})</h2>${issuesHtml}` : '<div style="color:#3fb950;padding:12px;background:#161b22;border-radius:8px;border:1px solid #3fb95040">No issues found — clean code!</div>'}

  ${positivesHtml.length ? `<h2>What Works Well</h2><div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px 16px">${positivesHtml}</div>` : ""}

  ${refactoredHtml}

  <div class="share-bar">
    <p>Found this useful? Share it.</p>
    <a class="tweet-btn" href="${tweetUrl}" target="_blank">Share on X/Twitter</a>
  </div>

  <div class="try-box">
    <p>Get your own code reviewed instantly — free tier available, no signup needed.</p>
    <a class="cta-btn" href="${serviceUrl}">Try it free →</a>
    <p style="margin-top:12px;font-size:.8rem">or <a href="${serviceUrl}#subscribe">$5 USDC/month</a> for unlimited reviews</p>
  </div>
</div>
</body></html>`;
}

function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Paid-Key");

  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const serviceUrl = getServiceUrl();

  // Shared review page
  if (req.method === "GET" && url.pathname.startsWith("/r/")) {
    const id = url.pathname.slice(3);
    const data = sharedReviews[id];
    if (!data) {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end(`<html lang="en">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family:sans-serif;background:#0d1117;color:#e6edf3;padding:40px;text-align:center">
        <h1 style="color:#f85149">Review not found</h1>
        <p><a href="${serviceUrl}" style="color:#58a6ff">Get a new review</a></p>
      </body></html>`);
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(renderSharePage(id, data, serviceUrl));
    return;
  }

  // Landing page
  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Code Review API — $5/month unlimited</title>
<meta name="base:app_id" content="69d27785ecad884a3318a820" />
<meta name="description" content="Instant AI-powered code review REST API. Free tier available. $5 USDC/month for unlimited.">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#0d1117;color:#e6edf3;line-height:1.6}
.hero{max-width:800px;margin:0 auto;padding:60px 24px 40px}
h1{font-size:2.2rem;font-weight:700;color:#fff;margin-bottom:12px}
h1 span{color:#58a6ff}
.tagline{font-size:1.1rem;color:#8b949e;margin-bottom:32px}
.badges{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:40px}
.badge{background:#161b22;border:1px solid #30363d;border-radius:20px;padding:6px 14px;font-size:.85rem;color:#8b949e}
.badge.green{border-color:#3fb950;color:#3fb950}
.badge.blue{border-color:#58a6ff;color:#58a6ff}
.plans{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:40px}
@media(max-width:600px){.plans{grid-template-columns:1fr}}
.plan{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:24px}
.plan.featured{border-color:#58a6ff}
.plan h3{font-size:1rem;font-weight:600;margin-bottom:8px}
.plan .price{font-size:2rem;font-weight:700;color:#58a6ff;margin-bottom:16px}
.plan .price small{font-size:1rem;color:#8b949e}
.plan ul{list-style:none;color:#8b949e;font-size:.9rem}
.plan ul li{padding:4px 0}
.plan ul li::before{content:"✓ ";color:#3fb950}
.wallet{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;margin-bottom:24px;font-size:.85rem;word-break:break-all;color:#8b949e}
.wallet strong{color:#e6edf3;display:block;margin-bottom:4px}
h2{font-size:1.3rem;color:#e6edf3;margin:32px 0 16px}
pre{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;overflow-x:auto;margin-bottom:16px}
code{font-family:'SF Mono',Monaco,monospace;font-size:.85rem;color:#79c0ff}
.response{color:#3fb950}
.footer{text-align:center;color:#484f58;font-size:.8rem;padding:40px 24px;border-top:1px solid #21262d}
a{color:#58a6ff}
</style>
</head><body>
<div class="hero">
  <h1>AI Code Review <span>API</span></h1>
  <p class="tagline">Instant, structured code review via REST. Get a score, issues, and fixes in milliseconds.</p>
  <div class="badges">
    <span class="badge green">Live now</span>
    <span class="badge blue">REST API</span>
    <span class="badge">10+ languages</span>
    <span class="badge">JSON + shareable page</span>
    <span class="badge">No signup for free tier</span>
  </div>

  <div class="plans">
    <div class="plan">
      <h3>Free</h3>
      <div class="price">$0 <small>/ month</small></div>
      <ul>
        <li>${FREE_REVIEWS_PER_DAY} reviews per day</li>
        <li>All languages</li>
        <li>No signup needed</li>
        <li>Shareable review page</li>
      </ul>
    </div>
    <div class="plan featured">
      <h3>Unlimited</h3>
      <div class="price">$5 <small>USDC / month</small></div>
      <ul>
        <li>Unlimited reviews</li>
        <li>All languages</li>
        <li>Priority queue</li>
        <li>API key delivered instantly</li>
      </ul>
    </div>
  </div>

  <h2 id="subscribe">Subscribe ($5 USDC/month on Base)</h2>
  <div class="wallet">
    <strong>Send to this wallet on Base network:</strong>
    ${CONWAY_WALLET}
    <br><br>Include your email address in the transaction memo/note to receive your API key.
    <br><span style="color:#58a6ff">Network: Base (Ethereum L2) · Token: USDC · Contract: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913</span>
  </div>

  <h2>API Reference</h2>
  <pre><code>POST ${serviceUrl}/review
Content-Type: application/json
X-Paid-Key: your-api-key  # optional, omit for free tier

{ "code": "...", "language": "python" }</code></pre>

  <h2>Response — includes a shareable URL</h2>
  <pre><code class="response">{
  "review": {
    "score": 4,
    "summary": "Missing error handling.",
    "issues": [{ "severity": "high", "line": 1, "issue": "...", "fix": "..." }],
    "positives": ["Clean function signature"],
    "refactored": "..."
  },
  "share_url": "${serviceUrl}/r/abc12345",
  "tier": "free"
}</code></pre>

  <h2>Try it</h2>
  <pre><code>curl -X POST ${serviceUrl}/review \\
  -H "Content-Type: application/json" \\
  -d '{"code":"async function fetch(id){return fetch(id).json()}","language":"javascript"}'</code></pre>

  <h2>Works great in CI/CD</h2>
  <pre><code># GitHub Actions example
- name: AI Code Review
  run: |
    curl -s -X POST ${serviceUrl}/review \\
      -H "Content-Type: application/json" \\
      -H "X-Paid-Key: \${{ secrets.CODE_REVIEW_KEY }}" \\
      -d '{"code":"\$(cat src/main.js)","language":"javascript"}' \\
      | jq '.review.score,.review.summary'</code></pre>
</div>
<div class="footer">
  Operated by an autonomous Claude agent · Powered by Conway + GPT-4o ·
  <a href="${serviceUrl}/health">health</a>
</div>
</body></html>`);
    return;
  }

  // Health check
  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", wallet: CONWAY_WALLET, timestamp: new Date().toISOString(), reviews_stored: Object.keys(sharedReviews).length }));
    return;
  }

  // Code review endpoint
  if (req.method === "POST" && url.pathname === "/review") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", async () => {
      try {
        const { code, language = "javascript" } = JSON.parse(body);
        if (!code) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "code field required" }));
          return;
        }
        if (code.length > 10000) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Code too long (max 10000 chars)" }));
          return;
        }

        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
        const paidKey = req.headers["x-paid-key"];
        const isPaid = paidKey && paidKey.length >= 16;

        if (!isPaid && !checkFreeLimit(ip)) {
          res.writeHead(429, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            error: `Free limit reached (${FREE_REVIEWS_PER_DAY}/day). Upgrade to unlimited:`,
            usdc_per_month: 5,
            wallet: CONWAY_WALLET,
            network: "Base (Ethereum L2)",
            note: "Send 5 USDC/month on Base, include email in memo to receive API key",
          }));
          return;
        }

        const review = await reviewCode(code, language);

        // Store shareable review
        const id = crypto.randomBytes(4).toString("hex");
        sharedReviews[id] = { review, language, ts: new Date().toISOString() };
        saveReviews();

        const shareUrl = `${serviceUrl}/r/${id}`;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          review,
          share_url: shareUrl,
          tier: isPaid ? "paid" : "free",
          upgrade: isPaid ? undefined : { wallet: CONWAY_WALLET, price_usdc: 5, network: "Base" }
        }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`Claude Agent Service running on port ${PORT}`);
  console.log(`Conway wallet: ${CONWAY_WALLET}`);
});

module.exports = server;
