# Climatico — Agent Natives Builders Hackathon

Cloudflare SF, 26–27 Aug 2026. Track: **Internal** (fleet) with an External-ready discovery surface.

The product is **`climatico/`**: an authenticated climate-action desk. A stranger agent discovers `/ai-agent.json`, mints a scoped bearer, and completes a write. The ingest → audit → settle fleet leaves durable handoffs.

**PRD (source of truth):** [`PRD.md`](PRD.md) — deck taxonomy + shipped Worker + live watch (awards, rubric, team Climatico, submitted — overwrite until Thursday 15:00 PDT lock).

**Live:** [`climatico.dalrae-jin-work.workers.dev`](https://climatico.dalrae-jin-work.workers.dev)

| Path | What |
| --- | --- |
| [`PRD.md`](PRD.md) | Product requirements |
| [`climatico/`](climatico/) | Worker: MCP, A2A, Agent Card, fleet, assessment UI |
| [`climatico/SUBMIT.md`](climatico/SUBMIT.md) | `ic_hack_submit` payload |
| [`hack-watch/`](hack-watch/) | Event page monitor (no tokens in git) |
| [`deck/`](deck/) | Agent Edition narrative |

Secrets stay local: `climatico/.dev.vars`, `hack-watch/.ic_token`. Copy `.dev.vars.example`.
