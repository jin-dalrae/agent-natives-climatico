# Climatico — Agent Natives Builders Hackathon

Cloudflare SF, 26–27 Aug 2026. Track: **Internal** (fleet) with an External-ready discovery surface.

The product is **`climatico/`**: an authenticated climate-action desk. A stranger agent discovers `/ai-agent.json`, mints a scoped bearer, and completes a write. The ingest → audit → settle fleet leaves durable handoffs.

**Live:** [`climatico.dalrae-jin-work.workers.dev`](https://climatico.dalrae-jin-work.workers.dev)

**PRD v0.3** — [`PRD.md`](PRD.md)
**README (plain English)** — [`climatico/README.md`](climatico/README.md) — honest DONE/LEFT checklist

| Path | What |
| --- | --- |
| [`PRD.md`](PRD.md) | Product requirements contract |
| [`climatico/README.md`](climatico/README.md) | Plain-English overview (read this first) |
| [`climatico/`](climatico/) | Worker: MCP, A2A, Agent Card, fleet, assessment UI, Clerk AI agent |
| [`climatico/SUBMIT.md`](climatico/SUBMIT.md) | Hackathon submission payload |
| [`hack-watch/`](hack-watch/) | Event floor monitor (live dashboard) |
| [`deck/`](deck/) | Agent Edition narrative deck |

**In the write path:** Cloudflare (runtime), Tavily (evidence), AIsa (M2M payments), Cotal (handoffs), Tenki (sandboxes).

Secrets stay local: `climatico/.dev.vars`, `hack-watch/.ic_token`. Copy `.dev.vars.example`.
