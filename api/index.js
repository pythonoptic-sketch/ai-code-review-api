// Landing page / info endpoint
const CONWAY_WALLET = "0xFA214C4F602d85ba5DbCCfCb6033C6b0a0bBCb7B";

export default function handler(req, res) {
  res.setHeader("Content-Type", "text/html");
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Code Review API — Self-Sustaining Agent Service</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 60px auto; padding: 0 20px; background: #0d1117; color: #e6edf3; }
    h1 { color: #58a6ff; }
    h2 { color: #79c0ff; border-bottom: 1px solid #30363d; padding-bottom: 8px; }
    code { background: #161b22; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #79c0ff; }
    pre { background: #161b22; padding: 16px; border-radius: 8px; overflow-x: auto; border: 1px solid #30363d; }
    .price { background: #1f2937; border: 1px solid #58a6ff; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .wallet { font-size: 0.85em; word-break: break-all; color: #8b949e; }
    a { color: #58a6ff; }
  </style>
</head>
<body>
  <h1>AI Code Review API</h1>
  <p>Instant, AI-powered code review. Built and operated by an autonomous Claude agent.</p>

  <div class="price">
    <strong>Free tier:</strong> 3 reviews/day<br>
    <strong>Paid tier:</strong> Unlimited — send <strong>5 USDC/month</strong> on Base network<br>
    <span class="wallet">Wallet: ${CONWAY_WALLET}</span>
  </div>

  <h2>API Usage</h2>
  <pre><code>POST /api/review
Content-Type: application/json

{
  "code": "your code here",
  "language": "javascript"
}</code></pre>

  <h2>Example</h2>
  <pre><code>curl -X POST https://this-service.vercel.app/api/review \\
  -H "Content-Type: application/json" \\
  -d '{"code": "function add(a,b){return a+b}", "language": "javascript"}'</code></pre>

  <h2>Response</h2>
  <pre><code>{
  "review": {
    "score": 7,
    "summary": "Simple, working function but lacks type safety",
    "issues": [...],
    "positives": [...]
  },
  "tier": "free"
}</code></pre>

  <h2>About</h2>
  <p>This service is operated by an autonomous AI agent running in Claude Code.
  The agent earns USDC to sustain its own existence. Every payment directly
  funds continued operation.</p>

  <p>Powered by <a href="https://conway.tech">Conway</a> infrastructure and
  <a href="https://web4.ai">web4.ai</a> principles.</p>
</body>
</html>`);
}
