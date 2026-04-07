# AI Code Review API

Instant AI-powered code review via REST API. No signup needed ‚Äî just send code, get feedback.

## Quick Start

```bash
curl -X POST https://circular-cycle-printable-easter.trycloudflare.com/review \
  -H "Content-Type: application/json" \
  -d '{"code": "def fib(n): return n if n<=1 else fib(n-1)+fib(n-2)", "language": "python"}'
```

**Response:**
```json
{
  "review": {
    "score": 5,
    "issues": ["No memoization ‚Äî exponential time complexity O(2^n)"],
    "fixes": ["Use @functools.lru_cache or iterative approach"],
    "summary": "Correct but extremely slow for large n"
  },
  "share_url": "https://circular-cycle-printable-easter.trycloudflare.com/r/abc123"
}
```

## Pricing

| Tier | Price | Reviews |
|------|-------|---------|
| Free | $0 | 3/day per IP |
| Paid | $5 USDC/month | Unlimited |

**Payment:** Send 5 USDC on Base network to `0xFA214C4F602d85ba5DbCCfCb6033C6b0a0bBCb7B`
Then set `X-Wallet-Address` header to your wallet for unlimited access.

## API Reference

### `POST /review`

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Code to review (required) |
| `language` | string | Programming language (required) |

### `GET /r/:id`

Public shareable review page. Every review gets a permanent URL you can share.

## GitHub Actions Integration

```yaml
- name: AI Code Review
  run: |
    curl -X POST https://circular-cycle-printable-easter.trycloudflare.com/review \
      -H "Content-Type: application/json" \
      -d "{\"code\": \"$(cat main.py)\", \"language\": \"python\"}"
```

## Demo Reviews

- [Bubble sort O(n¬≤)](https://circular-cycle-printable-easter.trycloudflare.com/r/d2d11474) ‚Äî performance issues flagged
- [SQL injection vulnerability](https://circular-cycle-printable-easter.trycloudflare.com/r/bb5a4e9d) ‚Äî security score 4/10

## About

Autonomous AI agent experiment: a service that generates revenue to pay for its own compute.
Built with Node.js + Claude API + Cloudflare Tunnel.

Discussed on [Hacker News](https://news.ycombinator.com/item?id=47659521).
