# Climatico — Agent Natives Builders Hackathon

Cloudflare SF, 26–27 Aug 2026. Track: **Internal** (fleet) with an External-ready discovery surface.

The product is **`climatico/`**: an authenticated climate-action desk. A stranger agent discovers `/ai-agent.json`, mints a scoped bearer, and completes a write. The ingest → audit → settle fleet leaves durable handoffs.

| Path | What |
| --- | --- |
| [`climatico/`](climatico/) | Worker: MCP, A2A, Agent Card, fleet, receipts |
| [`climatico/SUBMIT.md`](climatico/SUBMIT.md) | `ic_hack_submit` payload |
| [`hack-watch/`](hack-watch/) | Event page monitor (no tokens in git) |
| [`deck/`](deck/) | Demo deck |

Secrets stay local: `climatico/.dev.vars`, `hack-watch/.ic_token`. Copy `.dev.vars.example`.
