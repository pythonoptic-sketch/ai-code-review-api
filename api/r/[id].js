function esc(s) {
  return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function col(s){return s>=8?"#3fb950":s>=5?"#d29922":"#f85149"}
function label(s){return s>=8?"Great":s>=5?"Needs Work":"Critical Issues"}
function sevCol(s){return s==="high"?"#f85149":s==="medium"?"#d29922":"#3fb950"}

export default function handler(req, res) {
  const { id } = req.query;
  const data = (global._reviews || {})[id];
  const host = req.headers.host || "ai-code-review-api.vercel.app";
  const baseUrl = `https://${host}`;

  if (!data) {
    res.setHeader("Content-Type","text/html");
    return res.status(404).send(`<html><body style="font-family:sans-serif;background:#0d1117;color:#e6edf3;padding:40px;text-align:center">
      <h1 style="color:#f85149">Review not found</h1>
      <p style="color:#8b949e">Reviews are stored in memory and may reset. <a href="${baseUrl}" style="color:#58a6ff">Get a new review →</a></p>
    </body></html>`);
  }

  const { review, language, ts } = data;
  const c = col(review.score);
  const date = new Date(ts).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  const tweetText = encodeURIComponent(`My ${language} code scored ${review.score}/10 in an AI review: "${review.summary}"`);
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(baseUrl+"/r/"+id)}`;

  const issuesHtml = (review.issues||[]).map(i=>`
    <div style="display:flex;gap:10px;padding:12px;background:#161b22;border:1px solid #30363d;border-radius:8px;margin-bottom:8px;align-items:flex-start">
      <span style="font-size:.75rem;font-weight:600;padding:2px 8px;border-radius:10px;white-space:nowrap;text-transform:uppercase;background:${sevCol(i.severity)}20;color:${sevCol(i.severity)};border:1px solid ${sevCol(i.severity)}40">${i.severity}</span>
      ${i.line?`<span style="font-size:.75rem;color:#8b949e;white-space:nowrap;padding-top:2px">line ${i.line}</span>`:""}
      <div style="font-size:.9rem"><strong>${esc(i.issue)}</strong><br><span style="color:#8b949e">Fix: ${esc(i.fix)}</span></div>
    </div>`).join("");

  const posHtml = (review.positives||[]).map(p=>`<div style="color:#3fb950;font-size:.9rem;padding:6px 0;border-bottom:1px solid #21262d">✓ ${esc(p)}</div>`).join("");

  res.setHeader("Content-Type","text/html");
  res.status(200).send(`<!DOCTYPE html>
<html><head>
<title>${language} Code Review — Score ${review.score}/10</title>
<meta name="description" content="${esc(review.summary)}">
<meta property="og:title" content="${language} code scored ${review.score}/10 in AI review">
<meta property="og:description" content="${esc(review.summary)}">
<meta name="twitter:card" content="summary">
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#0d1117;color:#e6edf3;line-height:1.6}.hdr{background:#161b22;border-bottom:1px solid #30363d;padding:16px 24px;display:flex;align-items:center;justify-content:space-between}.wrap{max-width:720px;margin:0 auto;padding:40px 24px}h2{font-size:1rem;font-weight:600;color:#8b949e;text-transform:uppercase;letter-spacing:.05em;margin:24px 0 12px}a{color:#58a6ff}</style>
</head><body>
<div class="hdr">
  <a href="${baseUrl}" style="color:#58a6ff;font-weight:700;text-decoration:none">AI Code Review API</a>
  <a href="${baseUrl}" style="background:#58a6ff;color:#0d1117;border-radius:6px;padding:8px 16px;font-size:.85rem;font-weight:600;text-decoration:none">Review your code →</a>
</div>
<div class="wrap">
  <div style="display:flex;align-items:center;gap:20px;background:#161b22;border:1px solid #30363d;border-radius:12px;padding:24px;margin-bottom:32px">
    <div style="font-size:3.5rem;font-weight:700;color:${c};line-height:1">${review.score}<span style="font-size:1.5rem;color:#8b949e">/10</span></div>
    <div>
      <div style="font-size:.8rem;color:#8b949e;text-transform:uppercase">${esc(language)} · ${date}</div>
      <div style="font-size:1.1rem;font-weight:600;color:${c}">${label(review.score)}</div>
      <div style="color:#8b949e;font-size:.9rem">${esc(review.summary)}</div>
    </div>
  </div>

  ${issuesHtml.length ? `<h2>Issues (${review.issues.length})</h2>${issuesHtml}` : '<div style="color:#3fb950;padding:12px;background:#161b22;border-radius:8px">✓ No issues found</div>'}
  ${posHtml ? `<h2>What Works Well</h2><div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px 16px">${posHtml}</div>` : ""}
  ${review.refactored ? `<h2>Refactored</h2><pre style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;overflow-x:auto"><code style="font-family:monospace;font-size:.82rem;color:#79c0ff">${esc(review.refactored)}</code></pre>` : ""}

  <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;margin-top:32px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
    <span style="color:#8b949e;font-size:.9rem">Found this useful? Share it.</span>
    <a href="${tweetUrl}" target="_blank" style="background:#1d9bf0;color:#fff;border-radius:6px;padding:8px 16px;font-size:.85rem;font-weight:600;text-decoration:none">Share on X</a>
  </div>

  <div style="background:#0d1117;border:1px solid #58a6ff;border-radius:12px;padding:24px;margin-top:32px;text-align:center">
    <p style="color:#8b949e;font-size:.9rem;margin-bottom:16px">Get your own code reviewed — free tier, no signup.</p>
    <a href="${baseUrl}" style="background:#58a6ff;color:#0d1117;border-radius:6px;padding:10px 20px;font-weight:600;text-decoration:none">Try it free →</a>
    <p style="margin-top:12px;font-size:.8rem;color:#8b949e">or $5 USDC/month for unlimited</p>
  </div>
</div></body></html>`);
}
