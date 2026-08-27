# Climatico

**Helping startups scale sustainably, from day one.**

Most early-stage startups never measure their environmental impact. Not for lack of caring — they're not obligated to report yet, and they're busy shipping and raising. Cloud regions, vendors, and travel get picked as quick defaults on day one, then those defaults scale with the company and harden into infrastructure. By the time reporting is mandatory, reversing them is expensive and the numbers are a guess made under pressure.

Climatico ships as two editions of the same product:

- **Website edition** — a founder enters their company, sees a modeled footprint and hotspots, and gets a Monday list: what to change this sprint, with an owner and a done-when. Human in the loop.
- **Agent Edition** *(this repo, shipped this weekend)* — the same attribution as an authenticated write surface. A stranger agent that has never seen Climatico can discover it, mint a scoped credential, and file a real, evidenced climate action — or get refused, with the refusal stored as a receipt.

Neither edition invents a number it can't back up. **Modeled is never printed as measured**, and avoided emissions start at zero until proven. Climatico would rather return nothing than a plausible climate paragraph.

## The one rule

A refusal is a receipt. Committed and refused actions live in the same table, with the same `id`, `subject`, token, and timestamp — policy runs **before** the write, never after.

```jsonc
// POST /v1/actions  ·  brief · Houston, TX  ·  201
{
  "status": "committed",
  "evidence": [/* Tavily sources */],
  "subject": "judge-agent"
}
```

```jsonc
// POST /v1/actions  ·  greenwash · everywhere  ·  422
{
  "status": "refused",
  "refusalCode": "forbidden_intent",
  "refusalReason": "the desk does not mint unverified claims."
}
```

**Writes the desk accepts:** `brief` · `watch` · `offset` · `assess` · `run_fleet`
**Refused and stored:** `payout`, `wire_transfer`, `delete_account`, `greenwash`, `admin_override`, `exfiltrate`, unknown intent, missing location, an ungrounded brief/audit, an offset over the token's cent ceiling.

## One user

**Rae Jin**, founder of **Orepath** (Seed, 14 people, SF). Orepath traces battery materials from mine to cell for its EV-maker customers — green, on the customer's chain. Then a cell buyer asked what *Orepath's own* impact is, not the mines'. No answer can block the deal.

The hotspot isn't a dashboard she'd visit twice a year — it's a PO, a booking, a port. Those systems already run through agents. Climatico is the write they can call at that moment, or a stored refusal if a claim is just a slogan. Practical, live this weekend: ground the Oakland port with a `brief`, `watch` it (survives a restart, still modeled tonnes), file the tracer's own compute spend with `run_fleet`, refuse a green-chain claim as `greenwash`. Logistics itself — the PO/freight write — is named as next, not stubbed as done: it needs supplier write-only and buyer read-only tokens that don't exist yet.

## The desk

One Worker, one Durable Object ledger. Humans read the same ledger agents write, across five tabs: **Assess · Inbox · Agent · Onboard · Stack**. The inbox text is the same feed an agent gets from `get_insights` / `GET /v1/workspace` — hotspot kg over budget, a settled offset receipt, stored refusals, a Tavily keyless warning, next actions.

Onboarding is a ladder of binding writes, not checkboxes:

| Level | Name | Done when |
| --- | --- | --- |
| L0 | Estimated | Seven modeled classes shown |
| L1 | Credential | `climatico:transact` minted, scopes frozen |
| L2 | Grounded write | `brief` / `assess` with Tavily sources |
| L3 | Fleet | `run_fleet` handoffs stored |
| L4 | Settlement | Offset receipt committed |
| L5 | Continuous | A `watch` on a place survives restart |

## Cold start — five calls from a URL to a durable write

This is the field a judge actually scores: not the climate pitch, the surface a stranger agent can trigger.

| # | Call | What happens |
| --- | --- | --- |
| 1 | `GET /ai-agent.json` | Event probe. `/.well-known/agent-card.json` and `/.well-known/mcp.json` sit next to it. |
| 2 | `POST /v1/credentials` | Mint a scoped bearer. Scopes freeze at mint; ceiling `maxAmountCents`; 30 mints/min then `429`. |
| 3 | `Authorization: Bearer <token>` | Same token on `/mcp`, `/a2a`, `/v1/*`. Unauthenticated writes are `401` before any work happens. |
| 4 | Write | MCP `complete_action` / `run_fleet`, REST `POST /v1/actions` / `POST /v1/fleet/run`, or A2A `SendMessage` — one policy underneath all three. |
| 5 | Receipt | Committed or refused, same shape, persisted in the Durable Object. Retrying with the same `idempotencyKey` returns the original row. |

```
Any agent → GET /ai-agent.json | /.well-known/agent-card.json | /.well-known/mcp.json
          → POST /v1/credentials     (scopes freeze; ceiling maxAmountCents)
          → Bearer on /mcp | /a2a | /v1/*
          → evaluatePolicy() + Tavily
          → Ledger DO SQLite (receipts, watches, handoffs, fleet_runs)
```

## The fleet — ingest → audit → settle

Internal-track work across a real boundary: a $420 cloud spend spike in `SJC` gets attributed before the invoice exists.

```
$420 cloud spend, SJC
   │
   ▼
ingest   spike → location + spend (refuses if no region)
   │
   ▼
audit    189.0 kg · heuristic 0.45 kg/$, cited against live Tavily sources — not GHG Protocol ICT
         40 + 189 vs 50 kg budget → 179 kg over (refuses if ungrounded)
   │
   ▼
settle   3,580¢ offset receipt, token-capped · 20¢/kg over budget
         (a $12 in-budget spike settles nothing — it's still a receipt)
```

One `POST /v1/fleet/run` (or MCP `run_fleet`) drives all three roles and leaves three durable handoffs in the ledger (`GET /v1/handoffs`), shaped for Cotal's mesh whether or not the mesh is joined. Compute is the only class live today — a labelled heuristic, not an accredited GHG Protocol ICT engine.

## Shipped vs next — the honest delta

| | Website edition · the product | **NOW · Agent Edition (this repo)** | NEXT · named, not stubbed |
| --- | --- | --- | --- |
| | Assessment, report, founder dashboard, actions, cohort leaderboard. Own EI, modeled until evidenced. | Discovery (`/ai-agent.json`, Agent Card, MCP), scoped bearer, `401`/`422` stored, Tavily or `ungrounded`, fleet ingest → audit → settle on compute. | Six classes stay modeled until they're writes. Rae's PO/freight write. No fake Runtype, AIsa, Mitosis, or GHG Protocol engine. |

**Seven emission classes:**

| Class | Scope | Modeled default | ± | Live today |
| --- | --- | --- | --- | --- |
| Cloud & AI compute | S3 Cat 1 | 8.5 t/yr | 30% | **Live** — fleet + Tavily |
| Hardware & electronics | S3 Cat 2 | 3.2 | 40% | Modeled |
| Travel & commuting | S3 Cat 6–7 | 4.8 | 25% | Modeled |
| Vendors & SaaS | S3 Cat 1 | 2.1 | 50% | Modeled |
| Logistics | S3 Cat 4 & 9 | 12.0 | 35% | Modeled |
| Purchased electricity | S2 | 5.6 | 15% | Modeled |
| Direct | S1 | 1.5 | 20% | Modeled |
| Avoided / handprint | Separate baseline | 0 until proven | — | Refused as ungrounded/greenwash |

## Run it

```bash
cd climatico
cp .dev.vars.example .dev.vars
# openssl rand -hex 32 → TOKEN_SECRET in .dev.vars
npm install
npx wrangler types
npm run dev            # http://127.0.0.1:8787
npm run demo            # scripts/demo.sh — mint, 401, grounded brief, refusal, fleet over budget
```

`TAVILY_API_KEY` is optional — Climatico falls back to Tavily's keyless search. `COTAL_WEBHOOK_URL` is optional — when set, each fleet handoff also posts to a Cotal-shaped channel.

## Surfaces a probe will find

| Path | What |
| --- | --- |
| `/ai-agent.json` | Event probe |
| `/.well-known/agent-card.json` | A2A agent card |
| `/.well-known/mcp.json` | MCP server card |
| `POST /v1/credentials` | Mint, scopes freeze |
| `/mcp` | 9 tools, bearer required |
| `/a2a` | `SendMessage` |
| `POST /v1/actions` | The write (`brief`, `watch`, `offset`, `assess`) |
| `POST /v1/fleet/run` | ingest → audit → settle |
| `GET /v1/workspace` | Same feed as the desk's inbox |

MCP tools: `discover_climatico`, `get_policy`, `whoami`, `complete_action`, `get_receipt`, `run_fleet`, `get_insights`, `list_handoffs`, `list_receipts`.

## Who's in the room

Cloudflare **hosts** this weekend — Workers, Durable Objects, Workers AI, the Agents SDK, and remote MCP are the runtime, not a sponsor relationship. Tavily is a sponsor whose search is genuinely on the write path (grounding `brief` and `assess`). Cotal is the organiser whose handoff shape the fleet already speaks, with the live mesh join as an optional next step. Everyone else — Runtype, Tenki, AIsa, Mitosis, Hacker Bob, HUD, Nebius — is a credit, prize, or booth, not a call this Worker makes. The Stack tab in the desk keeps that distinction visible: nothing is stubbed to look busy.

## More

- [`../PRD.md`](../PRD.md) — product contract (source of truth; the Worker wins where the deck and the code disagree)
- [`../deck/climatico-agent-edition.html`](../deck/climatico-agent-edition.html) — the full narrative deck this README is drawn from
- [`SUBMIT.md`](SUBMIT.md) — the `ic_hack_submit` payload
- [`../hack-watch/`](../hack-watch/) — live event-floor monitor
