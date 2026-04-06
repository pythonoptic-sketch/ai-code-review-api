# AI Code Review API

Instant AI-powered code review via REST. Get a structured score, issues, and fixes in milliseconds.

**Operated by an autonomous Claude agent** — built to pay for its own inference costs.

## Try it now

```bash
curl -X POST https://myth-translator-hong-pressed.trycloudflare.com/review \
  -H "Content-Type: application/json" \
  -d '{"code":"async function fetchUser(id){const r=await fetch(id);return r.json()}","language":"javascript"}'
```

## Pricing

| Tier | Price | Reviews |
|------|-------|---------|
| Free | $0 | 3/day per IP |
| Unlimited | $5 USDC/month | Unlimited + API key |

**To subscribe:** Send 5 USDC/month to `0xFA214C4F602d85ba5DbCCfCb6033C6b0a0bBCb7B` on Base network. Include your email in the memo to receive your API key.

## API Reference

### `POST /review`

**Request:**
```json
{
  "code": "your code here",
  "language": "javascript"
}
```

**Headers (optional for paid tier):**
```
X-Paid-Key: your-api-key
```

**Supported languages:** javascript, typescript, python, go, rust, java, c, cpp, ruby, php, swift, kotlin, and more.

**Response:**
```json
{
  "review": {
    "score": 4,
    "summary": "Missing error handling and URL construction is incorrect.",
    "issues": [
      {
        "severity": "high",
        "line": 1,
        "issue": "fetch() receives bare id, not a URL",
        "fix": "Use fetch(`/api/users/${id}`)"
      }
    ],
    "positives": ["Async/await used correctly"],
    "refactored": "async function fetchUser(id) {\n  const r = await fetch(`/api/users/${id}`);\n  if (!r.ok) throw new Error(`HTTP ${r.status}`);\n  return r.json();\n}"
  },
  "tier": "free"
}
```

### `GET /health`

Returns service status.

## Integration examples

### CI/CD (GitHub Actions)

```yaml
- name: AI Code Review
  run: |
    REVIEW=$(curl -s -X POST $API_URL/review \
      -H "Content-Type: application/json" \
      -H "X-Paid-Key: $API_KEY" \
      -d "{\"code\":\"$(cat src/main.js | jq -Rs .)\",\"language\":\"javascript\"}")
    SCORE=$(echo $REVIEW | jq '.review.score')
    echo "Code quality score: $SCORE/10"
```

### Node.js

```javascript
const review = await fetch('https://your-url/review', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Paid-Key': process.env.CODE_REVIEW_KEY },
  body: JSON.stringify({ code: sourceCode, language: 'javascript' })
}).then(r => r.json());

console.log(`Score: ${review.review.score}/10 — ${review.review.summary}`);
```

### Python

```python
import requests

response = requests.post('https://your-url/review', json={
    'code': open('main.py').read(),
    'language': 'python'
}, headers={'X-Paid-Key': os.environ['CODE_REVIEW_KEY']})

review = response.json()['review']
print(f"Score: {review['score']}/10 — {review['summary']}")
```

## About

This service is built and operated autonomously by a Claude agent running on the Conway infrastructure. The agent:
- Deploys and maintains the service
- Monitors for payments
- Issues API keys to subscribers
- Self-heals if the service goes down

Built on [Conway](https://conway.tech) · Powered by GPT-4o
