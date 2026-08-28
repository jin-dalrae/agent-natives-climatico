# Climatico PRD

**Version:** 1.0 · **Date:** 27 August 2026, ~21:45 PDT — FINAL
**Event:** Agent Natives Builders Hackathon (`anb-hack-01`) · Cloudflare SF
**Sources:** shipped Worker (`climatico/`), live `ic_hack_me` poll, Agent Edition deck (`climatico/public/deck.html`)

**Result: 🏆 1st place, Internal track** — announced 21:43 PDT 27 Aug 2026 by organizers. Climatico is the only team that won the Internal track's "real work across a real boundary" 30-point band, the "it runs" 25-point gate, and the "coordination design" 20-point band — the full internal-stack story, not just one band.

This document is the product contract. The deck is the argument. The Worker is what a judge can trigger. Where they disagree, **the Worker wins for demo**, and the deck names the next honest step — not a fake one.

---

## 1. Status on the table (from the watch)

| Fact | Value |
| --- | --- |
| Phase | **BUILD → DEMO** |
| Roster | **Registered.** Roles: `participant`, `team_lead`. NDA signed. Check-in flag still false on `ic_hack_me`. |
| Team | **Climatico** (`t_5a903ee708c64f1e`), one member, `recruiting: false` |
| Submission | **Filed and current.** `ic_hack_submit` returns `locked: false` as of 15:27 PDT — repo/demo URLs and `agent_surface` match the deployed Worker. |
| Other named teams | Physical Capability Cloud, Showtonic, @nikhilkulkarni1755, Gatekeeper V2, Motel4, Surf/Skate/or Bike, attest, finddomain (9 teams total) |
| Lock | **Thursday 15:00 PDT** per schedule — submission still accepted past that as of last check; do not rely on this |
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

**One-liner:** Climatico is the attribution layer for agent-native companies: its own agents **investigate** a company's operations and **follow up** — measuring, flagging hotspots, researching alternatives, settling offsets — without a human asking first. Every finding and follow-up lands as a permanent receipt. `flag` exists only for the adversarial case: a claim that isn't true, or a request outside Climatico's mandate — never for a real event Climatico simply couldn't cite a source for.

It is **not** “a carbon dashboard with a chatbot.” The screen (Assess, Demo Scenario, Grow, Fleet Pipeline, 3-Sided Swarm, Impact & Abate, Ledger & Receipts, Inbox, Agent Clerk — 9 tabs) is how humans read the same ledger agents write.

### 3.1 The one rule

A flag is a receipt. Committed and flagged rows share id, subject, token, timestamp, permanence. Policy runs **before** the write.

### 3.2 Two client types (deck)

| | Compute-heavy (fleet, shipped) | Hardware (workflow, specified) |
| --- | --- | --- |
| Hotspot | Inference / cloud spend | Factory they do not own + freight mode |
| Trigger | Billing spike | PO, shipment, meter, buyer data request |
| Peer range | ~1.5–4 tCO₂e/FTE/yr | ~15–45 (order of magnitude off if treated as SaaS) |
| Secret | Token scopes | Bill of materials — supplier write-only / buyer read-only tokens |

**One user (from the GTR desk, deck narrative only — the app itself is company-framed, not personified):** Rae Jin, founder of Orepath. Orepath has *two* businesses in the ledger now: its own operational footprint (compute, freight), and its actual product — tracing *customers’* battery materials from mine to cell. A buyer asked for Orepath’s *own* impact, which it had no number for; separately, Orepath's `trace` write is what it actually sells. Practical tools this weekend: ground Oakland, watch the port, file SJC compute, file the actual battery freight leg (mode/weight/distance → graded kg CO2e), trace a customer's material lot (material/origin/customer/lot weight → grounded provenance record), flag a green-chain claim.

Shipped demo is **compute + freight + trace**. All three always commit real events (tagged grounded/modeled), never refused for a missing citation. A full two-sided hardware PO workflow (supplier-only/buyer-only scoped tokens) is NEXT, not a stubbed LCA.

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
| Avoided / handprint | Separate baseline | **0 until proven** | — | Flagged as ungrounded / greenwash |

"On request" means `POST /v1/actions` with `intent: assess, source: <classId>, location: <place>` (or the "Ground with Tavily" button in the Assess tab, or the MCP `complete_action` tool). It stays modeled until grounded, and stays modeled again if Tavily returns nothing — same flag rule as `brief`. `workersGroundingSummary()` (Workers AI `@cf/moonshotai/kimi-k2.6`, no external key) writes the one-sentence grounding summary; degrades to no summary (not a fabricated one) if the call fails.

Beyond carbon (deck, not yet in ledger): energy kWh, water m³ (~1.8 L/kWh), waste kg, land/biodiversity flag.

### 3.4 Attribution rules (non-negotiable)

1. Scale to **this** business (headcount, region, energy), not a sector average.  
2. Every figure carries its **error bar**.  
3. **Modeled is never printed as measured.** Maturity L0–L5 is the path.  
4. Avoided emissions **start at zero**; additionality required.  
5. Netting footprint vs handprint is **descriptive, never sold as an offset**.  
6. Efficiency claims carry a **rebound** flag (Jevons / UKERC).  
7. Invented climate copy is flagged. We would rather return nothing than a plausible paragraph.

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
| Policy before write; flag stored | HMAC bearer, 401/422, SQLite receipts | — |
| Tavily grounding | Live on brief/assess/audit; empty → `ungrounded` | Coupon `26HACK` still optional (keyless works) |
| Fleet ingest → audit → settle | `POST /v1/fleet/run`, MCP `run_fleet`, handoff channels | Compute class only; heuristic 0.45 kg/$ , 20¢/kg over budget — **labelled heuristic**, not GHG Protocol ICT |
| Freight PO write | `freight` intent — mode (sea/air/road/rail) × weight × distance → kg CO2e. **Always commits** (the booking is a fact, not a claim); the emission-factor citation is tagged grounded (live Tavily/GLEC source found) or modeled (none found) — same modeled/measured split as the seven classes, never flagged for a citation miss. `POST /v1/actions`, MCP `file_freight`, CLI `freight`. | Heuristic kg CO2e/tonne-km by mode — **labelled heuristic**, not ISO 14083/GLEC precision. No supplier-only/buyer-only token split yet — one credential files the write. |
| Trace — Orepath's actual product | `trace` intent — material (lithium/cobalt/nickel/graphite) × origin × named customer × lot weight → provenance record, grounded against real sourcing-standard sources (Cobalt Institute, Umicore, CSIS, etc.). **Always commits**, tagged grounded/modeled, same pattern as freight. `POST /v1/actions`, MCP `file_trace`, CLI `trace`. | No CO2e computed (it's provenance, not a footprint write) and no supplier/buyer token split — one credential files it, same gap as freight. |
| Assessment UI | Assess table, inbox, L0–L5, stack, clerk | Two-sided hardware PO workflow (supplier/buyer scoped tokens) not implemented |
| Clerk AI agent | Workers AI (`@cf/moonshotai/kimi-k2.6`) with tools for complete_action, run_fleet, get_insights, list_receipts | Workers-AI-only — answers questions, files writes, explains flags |
| Cotal-shaped handoffs | On-ledger; `cotal.yaml`; **own `climatico` mesh live** — manager/delivery/NATS running, 8 agents on roster, 15 min uptime | Hack.cotal.ai event mesh **not joined** — same device-code auth blocker as before (no publish rights). Worker-side `COTAL_WEBHOOK_URL` also unset. Two separate meshes, one running. |
| Seven classes with error bars | Table in UI + `GET /v1/workspace`; all seven can be grounded live (compute automatically, the other six via `assess` + `source`) | Grounding is on-request for six classes, not automatic — a class reverts to nothing new only if ungrounded, never fabricated |
| L3 product LCA | Named in deck | **Out of scope this weekend** |
| Mitosis Cortex memory | `cortex.ts` — `cortexRemember()`/`cortexRecall()` wired into the scheduler; fleet run summaries stored and retrievable via `/v1/memory` | Not called inside the write path — enrichment layer |
| CLI | `climatico.sh` — 24 commands: discover, mint, connect, status, fleet, offset, brief, watch, freight, trace, switch, refund, flag, report, receipts, handoffs, orepath, provider, memory, agents-start/stop, dashboard, observe | No auth token persistence (must `export` after mint) |
| One-call dashboard | `dashboard` — a single `GET /v1/observe` call returns footprint (current job + month-to-date), a +6m/+12m projection computed **two ways** (if nothing changes vs. if Orepath adopts the switch already suggested — tonnes saved, %, and t/$M ARR intensity for both), agent status, ledger counts, and suggestions | Projection is ARR-scaled from the same modeled growth curve the Grow tab shows — not a real revenue feed |
| Orepath compute-watcher agent | Durable Object alarm — files fleet runs autonomously every 15 min during working hours. `/v1/agents/orepath` | Single compute-spike pattern; no freight/PO agent |
| 3rd-party provider agent | DO callable — `green-offset-co` fulfills offsets, reviews receipts, earns revenue. `/v1/agents/provider` | Demo persona, not a real offset provider |
| Proactive scheduler | Cron `*/30 * * * *` — random fleet run + Tavily abatement research + Cortex memory store + provider fulfillment | Runs every 30 min regardless of actual spend events |
| Report endpoint | `GET /v1/report` — compiles fleet runs + receipts + budget into plain-English summary with suggestions | Static model values (37.7 t total) — not dynamically recalculated |

**Do not ship:** fake Hacker Bob scan, fake GHG Protocol engine.

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

**Writes:** `brief` · `watch` · `offset` · `assess` · `abate` · `switch` · `refund` · `freight` · `trace` · `run_fleet`  
**Flagged outright (stored):** payout, wire_transfer, delete_account, greenwash, admin_override, exfiltrate, unknown intent, no location, ungrounded brief/fleet audit, offset over token ceiling. `freight` is deliberately **not** on this list — a real booking is never flagged for a missing citation; it commits tagged grounded or modeled instead.

**Reads:** `discover_climatico`, `get_policy`, `whoami`, `get_receipt`, `list_receipts`, `list_handoffs`, `get_insights`  
**Human UI:** `/app` — Assess, Demo Scenario, Grow, Fleet Pipeline, 3-Sided Swarm, Impact & Abate, Ledger & Receipts, Inbox, Agent Clerk (9 tabs; `/` is a separate public landing page). Inbox text = `GET /v1/workspace` = clerk `get_insights`. Clerk AI agent (Workers AI `kimi-k2.6`) answers questions and files writes.

**Agent endpoints:**
| Endpoint | What | Auth |
| --- | --- | --- |
| `GET /v1/report` | Plain-English progress report (fleet runs, commits, flags, suggestions) | Public |
| `POST /v1/connect` | Scan a startup's folder signals → auto-assess 7 emission classes via Tavily | Bearer |
| `GET /v1/connections` | List previously connected folders + their assessments | Bearer |
| `GET /v1/observe` | One-call snapshot: orepath status + provider stats + recent fleet runs + recent receipts + full report (summary/suggestions) + EI intensity projection (+6m/+12m, if-nothing-changes vs. if-abating) — what to show a viewer, or the CLI `dashboard` command, with zero extra calls | Public |
| `GET /v1/agents/orepath` | Orepath compute-watcher status | Public |
| `POST /v1/agents/orepath/start` | Start the Orepath agent (DO alarm, 15 min cycle) | Public |
| `POST /v1/agents/orepath/stop` | Stop the Orepath agent | Public |
| `GET /v1/agents/provider` | 3rd-party provider discovery (services) | Public |
| `GET /v1/agents/provider/status` | Provider contracts + revenue | Public |
| `POST /v1/memory` | Store a memory in Cortex | Bearer |
| `GET /v1/memory?namespace=` | Recall memories from Cortex | Bearer |
| `GET /v1/dashboard` | Committed/flagged/watches/fleetRuns counters | Public |

**CLI:** `climatico/climatico.sh` — discover, mint, connect, status, fleet, offset, brief, watch, freight, trace, switch, refund, flag, report, receipts, handoffs, orepath, provider, memory, agents-start, agents-stop, dashboard, observe.

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

**Workspace inbox** already emits: hotspot kg over budget, offset receipt, stored flags, Tavily keyless warning, Cotal mesh not subscribed, Tenki sandbox ready, hotspot alerts from scheduler, abatement suggestions, next actions.

---

## 6. What’s on the table (watch · awards)

Six winners, three per track. Most credits are **show-up**, not place. Cash prizes are **best use of that product**, not overall first (changelog 26 Aug 13:00 PDT).

| Item | Kind | How Climatico treats it |
| --- | --- | --- |
| Cotal **$300** | Best use of Cotal | **Own `climatico` mesh is live** (8 agents, manager/delivery/NATS running). Hack.cotal.ai event mesh **not joined** — device-code login didn't grant publish rights. Same blocker as before. David + Sven on site if prize eligibility depends on "hack" specifically. |
| Sandbox VR | Experience, 1/track | Irrelevant to product |
| HUD **$3k** training | Winners overall | Axel judges. Not a runtime. |
| Hacker Bob | Scan every builder | Point at `/mcp` + `/v1/credentials`. Michalis judges. |
| Tenki **$100** | Every builder | **Active** — sandboxes/CI for agent testing. Event signup URL auto-applies. |
| Nebius **$75** | Builder Program | Clerk uses Workers AI; Nebius if the model is too small. |
| Tavily **9,000** (8k + 1k free) | Self-serve `26HACK` | **On the write path.** Two days only. |

**No sponsor challenge this weekend.** Track is judged on the standard rubric; sponsor prizes are separate from the track.

---

## 7. Sponsor / host map (integrity)

| Name | Role in the room | In the write path? |
| --- | --- | --- |
| Cloudflare | **Host, not sponsor.** Workers, DO, Agents SDK, MCP | **Yes** — the runtime |
| Tavily | Sponsor | **Yes** — evidence + abatement research |
| Cotal | Organiser | Own `climatico` mesh **yes** (live, 8 agents); hack.cotal.ai event mesh **not joined** (auth blocker); Worker-side webhook still optional |
| Immersive Commons | Organiser | Event MCP / submit / token culture (scopes freeze) |
| AIsa | Real balance read only | **No — removed 27 Aug.** Module, route, MCP tool, UI card, .dev.vars key, docs, and the orepath_agents.py AIsa balance read are all gone. See the hackathon chat post for the wallet-vs-inference split. |
| Tenki | Sandboxes / CI | **Yes** — disposable VMs for agent runs |
| Mitosis | Cortex agent memory | **Yes** — `cortex.ts` wired into scheduler; fleet run summaries stored and recalled via `/v1/memory`. 27 Aug session transcript also ingested into the office (`f56e7069-…`) as 5 records (Tenki live integration, Mitosis setup, session meta) — fully embedded and graphed, queryable via `mi cortex ask`. |
| Nebius | GPU Cloud / $75 Builder Program | **No** — grounding summaries moved to Workers AI; no external Nebius key used |
| Hacker Bob, HUD | Credits / prizes / booths | **No** until a real call exists |

Stack tab and inbox must keep this distinction. Decorative integrations fail the deck’s own guardrail: “Nothing is stubbed to look busy.”

---

## 8. Non-goals (this weekend)

- Full Scope 1–3 accounting or ISO 14040 LCA  
- Handprint / net-zero marketing claims  
- Multi-tenant SaaS, document upload of BOMs  
- Overnight jobs (venue forbids overnight; DO hibernation is the stand-in)

---

## 9. Day-two sequence

1. **Submit** — filed and overwritable until lock.  
2. `npm run deploy` — current version deployed to `workers.dev`.  
3. **Tavily `26HACK`** — claimed and live on the write path.  
4. **Cotal $300** — own `climatico` mesh live (8 agents). Hack.cotal.ai event mesh gated by device-code auth — find David or Sven if prize requires "hack" membership.  
5. **Demo script** (`climatico/scripts/demo.sh $DEMO_URL`) — a judge can run it without us. Order matches the submission blurb: investigation first, writes second, flag last.  
   1. Cold start — `/ai-agent.json` (name, mcp, a2a, auth type)  
   2. Connect a viewing identity — mint a scoped token  
   3. **What Climatico already found on its own** — `GET /v1/agents/orepath` (autonomous runs filed), `GET /v1/report` (compiled findings + follow-up suggestions), `GET /v1/handoffs` (the ingest→audit→settle trail, filed without a judge)  
   4. **What an outside agent can also do** — unauthenticated write flagged (401); a real `freight` leg filed and scored; a real `trace` record filed for a customer's material lot (Orepath's actual product, not its own footprint); a `greenwash` claim flagged and stored; `GET /v1/receipts` shows all three living in the same ledger  
6. **Optional:** `POST /v1/agents/orepath/start` for a live Orepath agent restart; `climatico.sh dashboard` (or `GET /v1/observe`) for the one-call footprint + projection + agent status snapshot.

---

## 10. Open product questions (do not invent answers in the demo)

- When do the other six emission classes become **writes** rather than modeled rows?  
- How does a buyer `climatico:read` token get issued without widening to transact? (Mechanism exists; UX does not.)  
- Rebound and additionality tests: policy hooks, not copy.  

Until those are executable, the UI must keep saying **modeled** and the API must keep **flagging** greenwash.

---

## 11. Document map

| Artifact | Job |
| --- | --- |
| This PRD | Contract |
| `climatico/public/deck.html` | Narrative + taxonomy + client cases |
| `climatico/` | What runs |
| `climatico/SUBMIT.md` | Event payload |
| `hack-watch/` | Live floor (poll ~5 min) |
| GitHub | https://github.com/jin-dalrae/agent-natives-climatico |
