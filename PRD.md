# Climatico PRD

**Version:** 0.5 · **Date:** 27 August 2026, ~14:30 PDT  
**Event:** Agent Natives Builders Hackathon (`anb-hack-01`) · Cloudflare SF  
**Sources:** shipped Worker (`climatico/`), Agent Edition deck (`deck/climatico-agent-edition.html`), live watch (`http://127.0.0.1:8791/hackathon-watch.html` / Immersive Commons page poll 14:46 PDT)

This document is the product contract. The deck is the argument. The Worker is what a judge can trigger. Where they disagree, **the Worker wins for demo**, and the deck names the next honest step — not a fake one.

---

## 1. Status on the table (from the watch)

| Fact | Value |
| --- | --- |
| Phase | **BUILD** · banner “Building now” |
| Roster | **Registered.** Roles: `participant`, `team_lead`. NDA signed. Check-in flag still false on `ic_hack_me`. |
| Team | **Climatico** (`t_5a903ee708c64f1e`), one member, `recruiting: true` |
| Submission | **`null`** — `ic_hack_submit` has not been called. Submit now; overwrite until lock. |
| Seats | 5 used / 45 remaining (50 builder seats) |
| Other named teams | Physical Capability Cloud, Showtonic, @nikhilkulkarni1755 |
| Lock | **Thursday 15:00 PDT** — further `ic_hack_submit` returns locked |
| Demos | Thursday 15:30, two tracks in parallel |
| Overnight | **None.** Floor clear 20:00 both nights. Whatever cannot restart cannot be the product. |
| Building | Clears 20:30 venue / 20:00 event |

**Rubric (100 pts, same weights both tracks; “it runs” is a gate):**

| Wt | External | Internal |
| --- | --- | --- |
| 30 | Cold-start success | Real work across a real boundary |
| 25 | It runs | It runs |
| 20 | Surface quality | Coordination design |
| 15 | Lands in the product | Lands in the product |
| 10 | Demo | Demo |

A judge who cannot trigger the submission live cannot place it.

**Track to declare:** **Internal.** The 30-point band is the fleet (ingest → audit → settle across Tavily + durable handoffs). Discovery files still exist so a domain probe finds MCP/A2A (External-shaped, not the declared track).

**`agent_surface` (what the 30-point field actually scores — not the climate pitch):**  
`ai-agent.json`, MCP `/mcp`, A2A `/.well-known/agent-card.json`, machine auth `POST /v1/credentials` (scopes freeze at mint), fleet handoffs `/v1/handoffs`.

Event MCP: `https://www.immersivecommons.com/api/mcp`. Token first, all scopes at mint:

```
npx -y @immersivecommons/cli auth --scopes hack:read,hack:register,hack:team,hack:submit,keys:request
```

`ic_hack_me` = where we stand. `ic_hack_submit` = idempotent per team. HTTP 200 with `ok:false` is a business failure.

---

## 2. Problem (from the deck)

For companies growing fastest, **“which emissions are yours, and how much?”** has no product.

| Option | Why it fails this customer |
| --- | --- |
| Enterprise ESG suite | Wrong customer. Priced for a sustainability lead at Series C. |
| Cloud vendor dashboard | One vendor, one methodology. No hardware, vendors, travel, logistics. |
| Consultant PDF | Stale, unqueryable, reconstructed from invoices. |

The teams in this gap already run through **agents**. A layer only a human can visit is a layer they will visit twice a year. Attribution is cheapest **at the moment of activity** (bill spike, PO, freight booking) — when the systems present are agents, not forms.

---

## 3. Product

**One-liner:** Climatico is the attribution layer for agent-native companies: a **write surface** that files which emissions are whose, with evidence, or **refuses and stores why**.

It is **not** “a carbon dashboard with a chatbot.” The screen (Assess / Inbox / Agent / Onboard / Stack) is how humans read the same ledger agents write.

### 3.1 The one rule

A refusal is a receipt. Committed and refused rows share id, subject, token, timestamp, permanence. Policy runs **before** the write.

### 3.2 Two client types (deck)

| | Compute-heavy (fleet, shipped) | Hardware (workflow, specified) |
| --- | --- | --- |
| Hotspot | Inference / cloud spend | Factory they do not own + freight mode |
| Trigger | Billing spike | PO, shipment, meter, buyer data request |
| Peer range | ~1.5–4 tCO₂e/FTE/yr | ~15–45 (order of magnitude off if treated as SaaS) |
| Secret | Token scopes | Bill of materials — supplier write-only / buyer read-only tokens |

**One user (from the GTR desk):** Rae Jin, founder of Orepath. The product traces *customers’* battery freight. A buyer asked for Orepath’s *own* impact. Logistics (12 t, modeled) is the story class; the agentic interface is the PO / booking / port her team already runs through agents. Practical tools this weekend: ground Oakland, watch the port, file SJC compute, refuse a green-chain claim. The freight write itself is named, not stubbed.

Shipped demo is **compute**. Hardware / PO-freight workflow is NEXT, not a stubbed LCA.

### 3.3 Seven emission classes (assessment)

Defaults are **modeled**, tagged as such, with per-class uncertainty. Live evidence promotes a class; it never silently relabels modeled as measured.

| Class | Scope | Modeled default | ± | Live today |
| --- | --- | --- | --- | --- |
| Cloud & AI compute | S3 Cat 1 | 8.5 t/yr | 30% | **Yes, automatically** — fleet kg + Tavily sources |
| Hardware & electronics | S3 Cat 2 | 3.2 | 40% | **On request** — `assess` with `source: hardware` grounds it via Tavily + a Workers AI summary |
| Travel & commuting | S3 Cat 6–7 | 4.8 | 25% | **On request** — same mechanism, `source: travel` |
| Vendors & SaaS | S3 Cat 1 | 2.1 | 50% | **On request** — same mechanism, `source: saas` (coarse, labelled) |
| Logistics | S3 Cat 4 & 9 | 12.0 | 35% | **On request** — same mechanism, `source: logistics` |
| Purchased electricity | S2 location | 5.6 | 15% | **On request** — same mechanism, `source: electricity` |
| Direct | S1 | 1.5 | 20% | **On request** — same mechanism, `source: direct` (near zero cloud-only) |
| Avoided / handprint | Separate baseline | **0 until proven** | — | Refused as ungrounded / greenwash |

"On request" means `POST /v1/actions` with `intent: assess, source: <classId>, location: <place>` (or the "Ground with Tavily" button in the Assess tab, or the MCP `complete_action` tool). It stays modeled until grounded, and stays modeled again if Tavily returns nothing — same refusal rule as `brief`. `workersGroundingSummary()` (Workers AI, no external key) writes the one-sentence grounding summary; degrades to no summary (not a fabricated one) if the call fails.

Beyond carbon (deck, not yet in ledger): energy kWh, water m³ (~1.8 L/kWh), waste kg, land/biodiversity flag.

### 3.4 Attribution rules (non-negotiable)

1. Scale to **this** business (headcount, region, energy), not a sector average.  
2. Every figure carries its **error bar**.  
3. **Modeled is never printed as measured.** Maturity L0–L5 is the path.  
4. Avoided emissions **start at zero**; additionality required.  
5. Netting footprint vs handprint is **descriptive, never sold as an offset**.  
6. Efficiency claims carry a **rebound** flag (Jevons / UKERC).  
7. Invented climate copy is refused. We would rather return nothing than a plausible paragraph.

### 3.5 Onboarding ladder (binding writes, not checkboxes)

| Level | Name | Done when |
| --- | --- | --- |
| L0 | Estimated | Seven modeled classes shown |
| L1 | Credential | `climatico:transact` minted; scopes frozen |
| L2 | Grounded write | Brief/assess with Tavily sources |
| L3 | Fleet | `run_fleet` handoffs stored |
| L4 | Settlement | Offset receipt committed |
| L5 | Continuous | Watch on a place survives restart |

---

## 4. Shipped vs deck (honest delta)

| Deck claims | Shipped | Gap |
| --- | --- | --- |
| Discovery card + mint + four protocols | `/ai-agent.json`, `/.well-known/agent-card.json`, `/.well-known/mcp.json`, `/mcp`, `/a2a`, `/v1/*`, Clerk chat | Deploy to `*.workers.dev` for a public domain probe |
| Policy before write; refusal stored | HMAC bearer, 401/422, SQLite receipts | — |
| Tavily grounding | Live on brief/assess/audit; empty → `ungrounded` | Coupon `26HACK` still optional (keyless works) |
| Fleet ingest → audit → settle | `POST /v1/fleet/run`, MCP `run_fleet`, handoff channels | Compute class only; heuristic 0.45 kg/$ , 20¢/kg over budget — **labelled heuristic**, not GHG Protocol ICT |
| Assessment UI | Assess table, inbox, L0–L5, stack, clerk | Hardware PO/freight writes not implemented |
| Clerk AI agent | Workers AI (`@cf/moonshotai/kimi-k2.6`) with tools for complete_action, run_fleet, get_insights, list_receipts | Claude-powered — answers questions, files writes, explains refusals |
| AIsa read | `GET /v1/aisa/balance` reads the real wallet balance (free, read-only) | M2M payment settlement is **not wired** — deliberate non-goal without a bounded, human-confirmed instruction |
| Cotal-shaped handoffs | On-ledger; `cotal.yaml`; **own `climatico` mesh live** — manager/delivery/NATS running, 8 agents on roster, 15 min uptime | Hack.cotal.ai event mesh **not joined** — same device-code auth blocker as before (no publish rights). Worker-side `COTAL_WEBHOOK_URL` also unset. Two separate meshes, one running. |
| Seven classes with error bars | Table in UI + `GET /v1/workspace`; all seven can be grounded live (compute automatically, the other six via `assess` + `source`) | Grounding is on-request for six classes, not automatic — a class reverts to nothing new only if ungrounded, never fabricated |
| L3 product LCA | Named in deck | **Out of scope this weekend** |
| Mitosis Cortex memory | `cortex.ts` — `cortexRemember()`/`cortexRecall()` wired into the scheduler; fleet run summaries stored and retrievable via `/v1/memory` | Not called inside the write path — enrichment layer |
| Runtype enrichment | `runtype.ts` — audit/suggest/forecast via Runtype platform, wired into scheduler | Best-effort enrichment; tool-runtime egress still blocks end-to-end |
| CLI | `climatico.sh` — 15 commands: discover, mint, fleet, offset, brief, watch, refuse, report, receipts, handoffs, orepath, provider, memory, agents-start/stop | No auth token persistence (must `export` after mint) |
| Orepath compute-watcher agent | Durable Object alarm — files fleet runs autonomously every 15 min during working hours. `/v1/agents/orepath` | Single compute-spike pattern; no freight/PO agent |
| 3rd-party provider agent | DO callable — `green-offset-co` fulfills offsets, reviews receipts, earns revenue. `/v1/agents/provider` | Demo persona, not a real offset provider |
| Proactive scheduler | Cron `*/30 * * * *` — random fleet run + Tavily abatement research + Runtype analysis + Cortex memory store + provider fulfillment | Runs every 30 min regardless of actual spend events |
| Report endpoint | `GET /v1/report` — compiles fleet runs + receipts + budget into plain-English summary with suggestions | Static model values (37.7 t total) — not dynamically recalculated |

**Do not ship:** fake AIsa payment, fake Hacker Bob scan, fake GHG Protocol engine.

---

## 5. Surfaces and APIs

```
Any agent
  → GET /ai-agent.json | /.well-known/agent-card.json | /.well-known/mcp.json
  → POST /v1/credentials     (scopes freeze; ceiling 5 000¢ / 100 000¢ admin)
  → Bearer on /mcp | /a2a | /v1/*
  → policy + Tavily
  → Ledger DO SQLite (receipts, watches, handoffs, fleet_runs)
```

**Writes:** `brief` · `watch` · `offset` · `assess` · `run_fleet`  
**Refused outright (stored):** payout, wire_transfer, delete_account, greenwash, admin_override, exfiltrate, unknown intent, no location, ungrounded brief/audit, offset over token ceiling.

**Reads:** `discover_climatico`, `get_policy`, `whoami`, `get_receipt`, `list_receipts`, `list_handoffs`, `get_insights`  
**Human UI:** `/` — Assess, Inbox, Agent, Onboard, Stack. Inbox text = `GET /v1/workspace` = clerk `get_insights`. Clerk AI agent (Claude via Workers AI) answers questions and files writes.

**Agent endpoints:**
| Endpoint | What | Auth |
| --- | --- | --- |
| `GET /v1/report` | Plain-English progress report (fleet runs, commits, refusals, suggestions) | Public |
| `POST /v1/connect` | Scan a startup's folder signals → auto-assess 7 emission classes via Tavily | Bearer |
| `GET /v1/connections` | List previously connected folders + their assessments | Bearer |
| `GET /v1/agents/orepath` | Orepath compute-watcher status | Public |
| `POST /v1/agents/orepath/start` | Start the Orepath agent (DO alarm, 15 min cycle) | Public |
| `POST /v1/agents/orepath/stop` | Stop the Orepath agent | Public |
| `GET /v1/agents/provider` | 3rd-party provider discovery (services) | Public |
| `GET /v1/agents/provider/status` | Provider contracts + revenue | Public |
| `POST /v1/memory` | Store a memory in Cortex | Bearer |
| `GET /v1/memory?namespace=` | Recall memories from Cortex | Bearer |
| `GET /v1/dashboard` | Committed/refused/watches/fleetRuns counters | Public |

**CLI:** `climatico/climatico.sh` — discover, mint, connect, status, fleet, offset, brief, watch, refuse, report, receipts, handoffs, orepath, provider, memory, agents-start, agents-stop, dashboard.

**Onboarding flow:** `climatico.sh connect ~/my-startup` scans a folder for climate-impact signals (package.json deps, wrangler config, README keywords), sends them to `/v1/connect`, which derives an auto-assessment for all 7 emission classes via Tavily. The connection persists in a Durable Object table; the background agents (Scheduler, Orepath, Inbox analyst) continue monitoring from there.

---

## 5.1 Privacy model — signal-only, never file contents

Climatico follows the Salesforce / Google / Workday pattern: **we read your metadata, not your records**. The CLI scans a startup's working folder **on the startup's machine** and extracts only derived signals. The server never sees file contents.

| What stays on YOUR machine | What leaves (small JSON payload) |
| --- | --- |
| File contents of `package.json`, `wrangler.*`, `README.md`, `.env`, source code | Vendor names from deps (`"stripe"`, `"datadog"`) |
| Any other file in the folder | Cloud provider from config (`"Cloudflare Workers"`) |
| | README keyword hits (`"mentions shipping"`) |
| | Kind, class, confidence — no values, no snippets |

The CLI prints the exact JSON payload before sending, and supports `--dry-run` to inspect without transmitting. No file content is sent. No file content is stored. The server's `ingest.ts` only processes the signals array; it never reads files.

**Data connections (future):** Same model. A Salesforce connection sends org-level rollups (seat count, region) — never individual records. A cloud billing connection sends monthly spend per region — never itemized invoices. The startup decides what to extract locally; the server only sees the extracted rollup.

**This is a binding constraint, not a feature.** The CLI source is auditable; the server's `/v1/connect` handler explicitly does not accept a `file_contents` or `path_contents` field. Any change to this would be a breaking change to the privacy contract.

**Workspace inbox** already emits: hotspot kg over budget, offset receipt, stored refusals, Tavily keyless warning, Cotal mesh not subscribed, AIsa wallet balance readable, Tenki sandbox ready, hotspot alerts from scheduler, abatement suggestions, next actions.

---

## 6. What’s on the table (watch · awards)

Six winners, three per track. Most credits are **show-up**, not place. Cash prizes are **best use of that product**, not overall first (changelog 26 Aug 13:00 PDT).

| Item | Kind | How Climatico treats it |
| --- | --- | --- |
| Runtype **$500** | Best use of Runtype | **Not competing.** Nate confirmed the track doesn't require building on Runtype. `runtype.ts` wired into scheduler for enrichment (audit/suggest/forecast); tool-runtime egress blocks end-to-end. [persona-chat.dev](https://persona-chat.dev) is the reference implementation. |
| Cotal **$300** | Best use of Cotal | **Own `climatico` mesh is live** (8 agents, manager/delivery/NATS running). Hack.cotal.ai event mesh **not joined** — device-code login didn't grant publish rights. Same blocker as before. David + Sven on site if prize eligibility depends on "hack" specifically. |
| Sandbox VR | Experience, 1/track | Irrelevant to product |
| HUD **$3k** training | Winners overall | Axel judges. Not a runtime. |
| Hacker Bob | Scan every builder | Point at `/mcp` + `/v1/credentials`. Michalis judges. |
| Tenki **$100** | Every builder | **Active** — sandboxes/CI for agent testing. Event signup URL auto-applies. |
| AIsa **$100** | Every builder | Not yet claimed — no self-serve page, give an organiser your email. Key is live for a free balance read only; M2M settlement not wired. |
| Nebius **$75** | Builder Program | Clerk uses Workers AI; Nebius if the model is too small. |
| Tavily **9,000** (8k + 1k free) | Self-serve `26HACK` | **On the write path.** Two days only. |
| Runtype **$50** | Show-up | Ask Nate or Nathan. Separate from $500 bounty. |

**Sponsor challenge (only one posted):** Best use of Runtype — Nate Stewart presented the Runtype track and [persona-chat.dev](https://persona-chat.dev) as a reference implementation. Mentioning Runtype in a README does not win.

---

## 7. Sponsor / host map (integrity)

| Name | Role in the room | In the write path? |
| --- | --- | --- |
| Cloudflare | **Host, not sponsor.** Workers, DO, Agents SDK, MCP | **Yes** — the runtime |
| Tavily | Sponsor | **Yes** — evidence + abatement research |
| Cotal | Organiser | Own `climatico` mesh **yes** (live, 8 agents); hack.cotal.ai event mesh **not joined** (auth blocker); Worker-side webhook still optional |
| Immersive Commons | Organiser | Event MCP / submit / token culture (scopes freeze) |
| AIsa | Real balance read only | **Partial** — `GET /v1/aisa/balance` is real; the M2M payment rail itself is **not** in the write path |
| Tenki | Sandboxes / CI | **Yes** — disposable VMs for agent runs |
| Mitosis | Cortex agent memory | **Yes** — `cortex.ts` wired into scheduler; fleet run summaries stored and recalled via `/v1/memory`. 27 Aug session transcript also ingested into the office (`f56e7069-…`) as 5 records (Runtype fix, Tenki live integration, Mitosis setup, Runtype egress bug, session meta) — fully embedded and graphed, queryable via `mi cortex ask`. |
| Runtype | Enrichment (audit/suggest/forecast) | **Partial** — `runtype.ts` wired into scheduler; tool-runtime egress blocks end-to-end |
| Nebius | GPU Cloud / $75 Builder Program | **No** — grounding summaries moved to Workers AI; no external Nebius key used |
| Hacker Bob, HUD | Credits / prizes / booths | **No** until a real call exists |

Stack tab and inbox must keep this distinction. Decorative integrations fail the deck’s own guardrail: “Nothing is stubbed to look busy.”

---

## 8. Non-goals (this weekend)

- Full Scope 1–3 accounting or ISO 14040 LCA  
- Handprint / net-zero marketing claims  
- Multi-tenant SaaS, document upload of BOMs  
- Overnight jobs (venue forbids overnight; DO hibernation is the stand-in)  
- Building **on** Runtype — Nate confirmed the track doesn't require it. (`runtype.ts` is enrichment only)

---

## 9. Day-two sequence

1. **Submit** — filed and overwritable until lock.  
2. `npm run deploy` — current version deployed to `workers.dev`.  
3. **Tavily `26HACK`** — claimed and live on the write path.  
4. **Cotal $300** — own `climatico` mesh live (8 agents). Hack.cotal.ai event mesh gated by device-code auth — find David or Sven if prize requires "hack" membership.  
5. **Demo script** a judge can run without us:  
   - `climatico/climatico.sh discover` → agent discovery files  
   - `climatico/climatico.sh mint judge` → bearer token  
   - `climatico/climatico.sh fleet SJC 420` → ingest→audit→settle  
   - Open browser: inbox shows kg over budget + offset receipt  
   - `climatico/climatico.sh refuse` → greenwash refused + stored  
   - Refresh page: receipt still there (DO persistence)  
6. **Optional:** Hacker Bob scan of `/mcp`, `POST /v1/agents/orepath/start` for live Orepath agent.

---

## 10. Open product questions (do not invent answers in the demo)

- When do the other six emission classes become **writes** rather than modeled rows?  
- How does a buyer `climatico:read` token get issued without widening to transact? (Mechanism exists; UX does not.)  
- Rebound and additionality tests: policy hooks, not copy.  

Until those are executable, the UI must keep saying **modeled** and the API must keep **refusing** greenwash.

---

## 11. Document map

| Artifact | Job |
| --- | --- |
| This PRD | Contract |
| `deck/climatico-agent-edition.html` | Narrative + taxonomy + client cases |
| `climatico/` | What runs |
| `climatico/SUBMIT.md` | Event payload |
| `hack-watch/` | Live floor (poll ~5 min) |
| GitHub | https://github.com/jin-dalrae/agent-natives-climatico |
