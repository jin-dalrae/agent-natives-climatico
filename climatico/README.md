# Climatico

Agent-native climate action desk for the **Agent Natives Builders Hackathon** (Aug 26–27 2026, Cloudflare SF). Track: **External**. A stranger agent that has never seen this product can discover it, mint a scoped credential, and complete a real write.

## Who is in the room (and what Climatico uses)

Cloudflare **hosts**. They are not a sponsor and they are not paying for the event. The runtime is theirs: Workers, Durable Objects, Workers AI, Agents SDK, remote MCP.

| Role | Who | What Climatico does with them |
| --- | --- | --- |
| Host | Cloudflare | Execution host. Ledger is a Durable Object. MCP is `createMcpHandler`. Agent Card + A2A on the same Worker. |
| Organised by | Immersive Commons | Token scopes freeze at mint. Agent Card / MCP / A2A are the surface `ic_hack_submit` should name. Event MCP: `https://www.immersivecommons.com/api/mcp`, event id `anb-hack-01`. |
| Organised by | Runtype | Sponsor challenge ($500). Do not fake a Runtype deploy. If you productize the prompt into their flows/evals, that is the bounty — optional Day 2. |
| Organised by | Cotal | A2A presence. Climatico already speaks `SendMessage` / `message/send` at `/a2a`. |
| Organised by | Nebius | GPU later if Workers AI is too small. Every builder gets Builder Program credits via [nebius.builders](https://nebius.builders). |
| Sponsor | Tavily | Live web evidence inside `brief` and `assess`. Coupon **`26HACK`** at [app.tavily.com](https://app.tavily.com) (Overview → Coupon). Keyless search works without a key. |
| Sponsor | Tenki | Agent sandbox / CI / reviewer — **not weather**, despite the name. Credits at [tenki.cloud/events/agent-native](https://tenki.cloud/events/agent-native). Optional, not in the write path. |
| Sponsor | Mitosis Labs | Memory that survives the session. Climatico's own memory is DO SQLite receipts/watches. Plug Mitosis if you want shared memory across agents. |
| Sponsor | Hacker Bob | Point their scan at `/mcp` + `/v1/credentials`. Auth is required; refusals are logged. |
| Sponsor | HUD | Training credits for winners, not a runtime dependency. |
| Community | Agent Community, Learning Layer, ClawCamp, DABL, Web A, HiRey, NERDCONF | Demo audience. Buzz/Hermes if you want a human+agent channel around the desk. |

Hermes Agent, Buzz, LangChain, and Cloudflare Think are **how we operate and orchestrate**. They are not the product. The product is Climatico's authenticated write surface.

## What changed on the floor (1:00pm PDT 26 Aug)

- Event is **BUILD**. Submissions are open. Overwrite until Thursday 15:00. Submit **now** (`SUBMIT.md`).
- `agent_surface` is the 30-point band. Their crawler looks for **`ai-agent.json`** and **mcp**. We now serve `/ai-agent.json`, `/.well-known/mcp.json`, `/.well-known/agent-card.json`.
- Runtype $500 and Cotal $300 are **best use of that product**, not first place overall.
- Cotal: no credits. Use [hack.cotal.ai](https://hack.cotal.ai). Optional `COTAL_WEBHOOK_URL`.
- No overnight: DO SQLite is the restart proof.

## Track: Internal (switch once, before Thursday lock)

Gemini's Scope 3 fleet idea is the demo. The **product** is still Climatico's authenticated write surface. Do not wire fake Runtype / Mitosis / AIsa / Hacker Bob calls — judges fail that.

Live fleet: **ingest → audit → settle** on one trigger (`POST /v1/fleet/run` or MCP `run_fleet`). Handoffs persist in SQLite (Cotal-shaped channels). Optional: `cotal up -f cotal.yaml` or [hack.cotal.ai](https://hack.cotal.ai) for the $300 Cotal bounty.

| Gemini named | What we actually run |
| --- | --- |
| Ingestion agent | `ingest` role, usage spike → location + spend |
| Audit agent | `audit` role, kgCO2e vs monthly budget, Tavily-grounded |
| Offset agent | `settle` role → existing `offset` receipt |
| Cotal | Durable handoff log + `cotal.yaml`. Mesh is extra. |
| Tavily | Live evidence inside audit (already working) |
| AIsa / Runtype / Mitosis / Hacker Bob | Not in the write path. Ask organisers / booths. Do not fake. |

## Cold-start (this is the 30-point band)

1. `GET /.well-known/agent-card.json`
2. `POST /v1/credentials` `{ "subject": "judge-agent", "scopes": ["climatico:read","climatico:transact"] }`
3. `Authorization: Bearer <token>`
4. MCP tool `complete_action` **or** `POST /v1/actions` **or** A2A `SendMessage`
5. Receipt is durable. `greenwash`, payouts, and ungrounded briefs are **refused and stored**.

Allowed writes: `brief`, `watch`, `offset`, `assess`. Each needs a **location**. `offset` also needs `amountCents`. Briefs that cannot be grounded with Tavily are refused — Climatico will not invent climate.

## Run

```bash
cd climatico
cp .dev.vars.example .dev.vars
# paste openssl rand -hex 32 into TOKEN_SECRET
npm install
npx wrangler types
npm run dev
```

Then `npm run demo` against http://127.0.0.1:8787 (Vite is pinned to that port).

Hermes: mint a token, put it in `CLIMATICO_TOKEN`, merge `scripts/hermes.yaml` into `~/.hermes/config.yaml`.

LangChain peer: `python langchain/climatico_agent.py`

## Submit

`agent_surface`: `MCP /mcp`, `A2A /a2a`, `Agent Card /.well-known/agent-card.json`, scoped bearer tokens at `/v1/credentials`.

Event token (scopes freeze at mint):

```bash
npx -y @immersivecommons/cli auth --scopes hack:read,hack:register,hack:team,hack:submit,keys:request
```
