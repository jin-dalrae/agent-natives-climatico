# Climatico — Autonomous Carbon Attribution Layer (v1.0 Standalone)

Climatico is an autonomous, agent-native carbon attribution and climate action ledger. Originally built and awarded **🏆 1st place (Internal Track)** at the Agent Natives Builders Hackathon in SF, Climatico has been decoupled from temporary hackathon sponsor SDKs and fully modernized as a production-ready, standalone MVP.

**Live:** [`climatico.dalrae-jin-work.workers.dev`](https://climatico.dalrae-jin-work.workers.dev)

| Path | What |
| --- | --- |
| [`PRD.md`](PRD.md) | Product requirements (v1.0 — final) |
| [`climatico/climatico.sh`](climatico/climatico.sh) | CLI — talk to the desk from your terminal |
| [`climatico/`](climatico/) | Worker + 8 agents (Orepath, Provider, Fleet, Clerk, Scheduler, Abatement, Analysts) |
| [`climatico/public/assets/climatico-icon.png`](climatico/public/assets/climatico-icon.png) | Canonical transparent Climatico mascot icon used by the favicon and app headers |

Secrets stay local: `climatico/.dev.vars`, `hack-watch/.ic_token`. Copy `.dev.vars.example`.

---

## What is Climatico?

Climatico's own agents **investigate** a company's environmental impact — today
and projected forward — and **follow up** on what they find, without a human
asking first. They break impact down by business area (cloud compute,
shipping, travel), flag hotspots, research greener alternatives, and settle
offsets — all autonomously. Every finding and every follow-up is a permanent
receipt written to a Durable Object SQLite ledger.

### 🚀 v1.0 Post-Hackathon Upgrades

- **Gemini-first Engine**: **Google Gemini 1.5 Flash** powers Clerk chat through `@ai-sdk/google` and drives agentic grounding and factor analysis through the Gemini API.
- **Google Search Grounding**: Uses live Google Search Grounding on the write path to fetch and cite real-world climate evidence, with Tavily retained as a fallback.
- **Decoupled & Standalone**: Replaced direct proprietary hackathon SDK integrations with resilient local in-memory fallbacks for Cortex memory and Tenki sandboxes, so local development remains available without those service credentials.
- **UX & Tab Consolidation**: Slimmed down from a busy 9-tab layout to **4 core tabs** (`Assess`, `Abate & Actions`, `Ledger & Pipeline`, `Agent Clerk`) paired with an elegant, real-time `RuntimeStatusBar`.
- **Cadinal Mascot Integration**: Integrated our friendly blue seal mascot across the app to support micro-interactions: `MascotWaving` (Greeting & Footer), `MascotThinking` (Gemini grounding/loading states), and `MascotThumbsUp` (committed actions and receipts).
- **Canonical Icon Asset**: The transparent mascot artwork in `climatico/public/assets/climatico-icon.png` is the single app icon source for the landing favicon and workspace header. Keep its alpha channel intact when producing derivatives.

---

## The one big idea (remember this)

**A flag is a receipt.**

- If an agent asks to file a climate action and we say yes → we save a receipt.
- If an agent asks something shady (like "delete my account" or "call this
  green" with no proof) → we say **no** and we **save that too**.

Committed and flagged live in the same notebook, with the same shape. Nothing
is silently dropped. If a judge checks later, every attempt is on the record.

Because: *"We would rather return nothing than a plausible climate paragraph."*

---

## How a stranger agent uses it (the story)

Imagine a robot has never met Climatico. Here's what happens in 5 steps:

| Step | What happens | Like... |
| --- | --- | --- |
| 1. Find it | Robot opens `/ai-agent.json` | A sign on the door: "agents welcome here" |
| 2. Get a key | `POST /v1/credentials` gives it a **bearer token** | A hotel keycard that only opens certain doors |
| 3. Prove who it is | Token is sent on every call | Showing the keycard at each door |
| 4. Do something | Robot files a **write** (see below) | Signing a form — but by a robot, instantly |
| 5. Get proof | Every write returns a **receipt** | A stamped receipt, kept forever |

The keycard detail: **permissions freeze the moment the key is made.** You cannot
upgrade a key later — if the robot wants more power, it needs a brand-new key and
a human to approve it.

---

## What the desk accepts (the writes)

| Word | What it means | Example |
| --- | --- | --- |
| `brief` | Write a short, evidence-backed climate note | "Here's what climate risk looks like for Oakland port" |
| `watch` | Keep an eye on a place over time | "Alert me about heat / air quality in Lahaina" |
| `offset` | Pay to balance out emissions | "Commit $25 of offsets" (money is capped by token) |
| `assess` | Score a site's climate risk, or ground one of the 6 non-compute classes | "Assess the Shenzhen factory" |
| `abate` | Record a reduction plan for a business source | "Move compute to a lower-carbon region" |
| `freight` | File a real freight leg — a fact, always commits | "8,000kg by sea, Shenzhen → Oakland, 11,000km" |
| `trace` | File a customer's material lot provenance — a fact, always commits | "500kg cobalt, DRC → Acme EV" |
| `switch` | Log a transition to a greener solution | "We moved from X to Y" |
| `refund` | Claim back the difference after a `switch` | "Refund the delta on the prior offset" |
| `run_fleet` | Turn a spend spike into a receipt | "$420 cloud bill in SJC → how many kg → offset if over budget" |

### What gets flagged (and stored)

`payout`, `wire_transfer`, `delete_account`, `greenwash` (a climate claim with no
evidence), `admin_override`, `exfiltrate`, unknown requests, requests with no
location, and briefs/fleet audits with no real sources. **`freight` and `trace`
are never flagged for a missing citation** — a real booking or a real material
lot commits either way, tagged grounded or modeled.

---

## The fleet (our coolest piece — DONE)

`run_fleet` is three **small agents** working like an assembly line:

```
  a cloud bill spikes: $420 in SJC
        │
        ▼
  ① INGEST   — "Where and how much?"  (flags if no location)
        │
        ▼
  ② AUDIT    — "How many kg of CO2 is that?"  (checks the internet for real factors, flags if it can't find any)
        │
        ▼
  ③ SETTLE   — "Over monthly budget? Then commit an offset receipt."
```

Every step writes a **handoff** — a note passed to the next agent that is saved
forever. A human (or another agent) can read the whole chain later:
`GET /v1/handoffs`.

This is the "real work across a real boundary" judging band: our fleet talks to
three different outside systems.

A real, working demo of this end to end — real credential minting, a real fleet
run with real Tavily evidence, a real flagged greenwash claim, a real read-only
buyer audit — lives in
[`climatico/scripts/two_sided_swarm.py`](climatico/scripts/two_sided_swarm.py).
It runs as one sequential script against the live Worker; the named roles in its
output (`TracerFleetAgent`, `ComplianceAgent`, etc.) are narration labels for that
script, not separately-running services.

---

## Five ways into the same room

| Door | Who uses it | Status |
| --- | --- | --- |
| `/mcp` | AI agents (MCP protocol), 16 tools | **DONE** |
| `/a2a` | AI agents (Agent-to-Agent protocol) | **DONE** |
| `/v1/*` | Any program (REST API) — includes `/v1/report`, `/v1/observe`, `/v1/agents/*`, `/v1/memory`, `/v1/dashboard` | **DONE** |
| `/app` (web page) | Humans — 4 core tabs (Assess, Abate, Ledger, Clerk) and real-time status bar | **DONE** |
| `climatico.sh` | CLI — 24 commands from your terminal | **DONE** |

All five use the **same** notebook: one Durable Object running SQLite
on Cloudflare. That notebook survives restarts — nothing important is lost
overnight.

There is also an **Agent Clerk** — an AI chat assistant powered by Gemini 1.5. Ask it
questions, or ask it to file a write. It uses the same tools any agent would.

---

## Check: what's DONE vs what's LEFT

### ✅ DONE (real, running today)

- Live on the internet: **https://climatico.dalrae-jin-work.workers.dev**
- Discovery files agents can find (`/ai-agent.json`, agent card, MCP card)
- Token minting with frozen permissions and spending caps
- Policy that says **no** before the write, and stores the flag
- All 9 writes + the fleet pipeline, returning durable edge receipts
- Consolidated Assess, Abate, Ledger, and Clerk views in the UI
- **Google Search Grounding** via Gemini on the write path (grounds briefs/audits; Tavily fallback)
- Clerk AI chat assistant (Gemini-powered)
- Hackathon submission filed and current — repo/demo URLs match the deployed Worker
- ✅ **Orepath compute-watcher agent** — DO alarm, files fleet runs every 15 min during working hours. `/v1/agents/orepath`
- ✅ **3rd-party provider agent** — `green-offset-co` fulfills offsets, reviews receipts. `/v1/agents/provider`
- ✅ **Scheduled fleet** — cron every 30 min runs ingest→audit→settle with random location/spend
- ✅ **Abatement researcher** — Gemini search for real greener alternatives per emission class, with Tavily fallback
- ✅ **Report builder** — `/v1/report` compiles fleet runs + receipts + budget into plain-English summary
- ✅ **Inbox analyst** — hotspot alerts and suggestions pushed to the workspace inbox automatically
- ✅ **Cortex memory** — `cortex.ts` stores fleet run summaries, retrievable via `/v1/memory`. **Mitosis Cortex** wired into scheduler.
- ✅ **CLI** — `climatico.sh` with 24 commands: discover, mint, connect, status, fleet, offset, brief, watch, freight, trace, switch, refund, flag, report, receipts, handoffs, orepath, provider, memory, agents-start/stop, dashboard, observe
- ✅ **Freight write** — `freight` intent takes mode (sea/air/road/rail), weight, distance, grounds against real Gemini Search evidence (with Tavily fallback), scores kg CO2e via a labelled heuristic. **Always commits** — a real booking is a fact, never flagged for a missing citation, only tagged grounded or modeled. `POST /v1/actions`, MCP `file_freight`, CLI `climatico.sh freight`.
- ✅ **Trace write — Orepath's actual product** — `trace` intent files a customer's material-lot provenance (material, origin, named customer, lot weight), grounded against real sourcing-standard evidence. This is what Orepath *sells*, distinct from its own footprint — closes a gap the rest of this system didn't cover. Always commits, tagged grounded/modeled. `POST /v1/actions`, MCP `file_trace`, CLI `climatico.sh trace`.
- ✅ **Supply-chain scoped tokens** — `climatico:supplier` can file only freight and trace records; `climatico:buyer` can create briefs, watches, assessments, and independent sandbox verifications. Use `climatico.sh mint <subject> climatico:supplier` or `climatico:buyer` to mint either role.
- ✅ **Solution switch + offset refund** — `switch` logs a transition to a greener solution against a prior offset receipt; `refund` claims back the delta. Provider agent processes the reversal and records it.
- ✅ **One-call dashboard** — `climatico.sh dashboard` hits a single endpoint (`/v1/observe`) and prints footprint (current job, month-to-date), a +6m/+12m projection computed two ways (if nothing changes vs. if Orepath adopts the switch already suggested — tonnes saved, %, and t/$M ARR intensity either way), agent status, ledger counts, and suggestions.
- Cotal: **two meshes, one live.** Our own `climatico` mesh is genuinely joined
  and running — manager/delivery/NATS all up, 8 roster agents, 15+ min uptime.
  The hack.cotal.ai event mesh (tied to the $300 best-use prize) is **not joined**
  — same device-code auth blocker as day 1 (no publish rights granted). The
  Worker's `COTAL_WEBHOOK_URL` is a separate, still-unset, optional path.
- A `watch` write is filed (L5 onboarding step complete — a watch survives restart)
- All 6 non-compute emission classes can be grounded live against real Gemini
  sources on demand (`assess` with `source` set to the class id, or the "Ground
  with Gemini" button in the Assess tab). They start modeled and stay modeled
  until grounded — nothing is claimed live until it actually is.
- Grounding summaries run on **Gemini 1.5 Flash** when configured; evidence collection falls back to Tavily if Gemini is unavailable.
- **Cortex & Tenki Local Fallbacks**: Removed proprietary dependencies, ensuring the app runs standalone.

### 🔜 LEFT (honest "not yet" list)

- Each emission class starts **modeled** — an estimate with an error bar — until
  it's actually grounded. Compute grounds automatically from fleet activity; the
  other six ground on request (see above), not automatically.
- The Worker's own Cotal webhook (`COTAL_WEBHOOK_URL`) is still optional — the
  code path (`announceHandoff`) fires automatically once it is, it just needs
  a real URL from the Cotal booth. Our own `climatico` mesh is live regardless
  (see above).

### 🚫 We will not fake

We ship what runs and we say what we haven't.

---

## Agent architecture

| Agent | What it does | Where | Core Tech |
|-------|-------------|-------|-------------|
| **Orepath compute-watcher** | Employee agent — monitors cloud spend, files fleet runs every 15 min autonomously | DO alarm | — |
| **Green offset provider** | 3rd-party — fulfills offsets, reviews receipts, earns revenue | DO callable | — |
| **Scheduler** | Cron — runs fleet + research every 30 min | Cron trigger | — |
| **Ingest** | Reads spend, validates location, flags if no region | Fleet pipeline | — |
| **Audit** | Scores kgCO₂e via web evidence, checks budget | Fleet pipeline | **Gemini / Google Search, Tavily fallback** |
| **Settle** | Commits offset receipt if over budget | Fleet pipeline | — |
| **Abatement researcher** | Searches for real greener alternatives per class | Cron | **Gemini / Google Search, Tavily fallback** |
| **Summary writer** | Writes plain-English abatement plans | Edge | **Gemini 1.5** |
| **Report builder** | Compiles runs+receipts into `/v1/report`, plus a +6m/+12m EI intensity projection via `/v1/observe` | REST | — |
| **Inbox analyst** | Pushes hotspot alerts + suggestions to workspace | Insights | — |
| **Cortex memory** | Stores fleet run summaries, retrievable by namespace | REST | **Local Fallback / Cortex** |
| **Clerk** | AI chat — answers questions, files writes, explains flags | Edge | **Gemini 1.5 Flash** |

---

## Technical Stack

| Name | Role | Do we really use it? |
| --- | --- | --- |
| Google Gemini | **Primary AI Engine.** Generates content, grounds evidence, and hosts Agent Clerk | YES — via `@ai-sdk/google` |
| Google Search | **Search Grounding.** Verified citations for carbon and policy assessments | YES — via Gemini Grounding API |
| Tavily | **Evidence fallback.** Used when Gemini grounding is unavailable | YES — search fallback |
| Cloudflare | **Edge runtime.** Workers, Durable Objects, and agent infrastructure | YES — application host |
| Cotal | Organiser. Agent mesh | Partial — own `climatico` mesh live (8 agents); Worker-side webhook is optional |
| Mitosis | Cortex agent memory | Optional — local in-memory fallback active by default; Mitosis API key used when configured |
| Tenki | Sandboxes / CI | Optional — local sandbox session manager active by default |

The UI keeps this distinction visible so nothing *looks* wired in when it isn't.

---

## The customer story (why this exists)

**Rae Jin** runs **Orepath** — a startup that traces battery materials (lithium,
cobalt, nickel) from mine to car, for EV makers.

A cell buyer asked: *"What's YOUR company's footprint — not the mines'?"*
Rae had no number. That question can block a deal.

- Orepath's **biggest** footprint is **logistics** (12 tonnes/yr, ±35%) — still modeled.
- Orepath has two things in the ledger: its **own** footprint, and its actual
  **product** — tracing customers' battery materials.
- What Rae can file **today**: ground the Oakland port (`brief`), watch it
  (`watch`), file the SJC compute bill that runs the tracer (`run_fleet`), file
  the actual battery freight leg (`freight` — mode, weight, distance → real
  grounded kg CO2e), trace a customer's material lot (`trace` — material,
  origin, customer, lot weight → grounded provenance record — this is what
  Orepath sells), and flag any green supply-chain slogan (`greenwash` →
  flagged & stored).
- **Next:** supplier-only / buyer-only scoped tokens for the two-sided PO flow.

---

## Run it yourself (short version)

```bash
cd climatico
cp .dev.vars.example .dev.vars   # then add a TOKEN_SECRET and GEMINI_API_KEY
npm install
npx wrangler types
npm run dev                      # http://127.0.0.1:8787
```


## CLI

```bash
cd climatico
./climatico.sh discover          # Agent discovery files
./climatico.sh mint judge        # Mint a bearer token
export CLIMATICO_TOKEN="<token>"
./climatico.sh fleet SJC 420     # Ingest → audit → settle
./climatico.sh freight "Shenzhen -> Oakland" sea 8000 11000  # File a real freight leg
./climatico.sh trace "Democratic Republic of Congo" cobalt "Acme EV" 500  # File a provenance record
./climatico.sh dashboard         # One-call footprint + EI projection + agent status
./climatico.sh report            # Plain-English progress report
./climatico.sh flag              # Test a forbidden claim
./climatico.sh orepath           # Check Orepath agent status
./climatico.sh agents-start      # Start auto-pilot (15 min cycles)
./climatico.sh connect ~/my-startup  # Scan folder, auto-assess 7 classes
./climatico.sh connect ~/my-startup --dry-run  # Show the payload, send nothing
./climatico.sh status            # Show connected folders + assessments
./climatico.sh switch SJC "move compute to FRA" <priorId> 3580 500  # Log a switch
./climatico.sh refund SJC <priorId> 3580 500  # Claim refund on prior offset
./climatico.sh observe           # Watch Orepath agent live (10s refresh)
./climatico.sh receipts          # Recent receipts
./climatico.sh handoffs          # Recent handoff log
./climatico.sh help              # Full command list
```

---

## Privacy — your business data never leaves your machine

Climatico follows the Salesforce / Google / Workday pattern: **we read your metadata, not your records**.

When you run `./climatico.sh connect ~/my-startup`:

| Stays on your machine | Leaves (small JSON payload) |
| --- | --- |
| File contents of `package.json`, `wrangler.*`, `README.md`, `.env`, source code | Vendor names from deps (`"stripe"`, `"datadog"`) |
| Anything else in the folder | Cloud provider from config (`"Cloudflare Workers"`) |
| | README keyword hits (`"mentions shipping"`) |
| | Kind, class, confidence — **no values, no snippets** |

The CLI prints the exact JSON payload before sending and supports `--dry-run` to inspect without transmitting. No file content is sent. No file content is stored. The server's `/v1/connect` handler does not accept a `file_contents` field — by design, by contract, by source code.

**This is the binding rule**, not a feature. Auditable in the CLI source. Future data connections (Salesforce, Google billing, Workday) will follow the same model: extract rollups locally, send rollups, never records.

---

## More (deep dives, for when you have energy)

- [`PRD.md`](PRD.md) — the full product contract (v0.7)
- [`climatico/public/deck.html`](climatico/public/deck.html) — the pitch deck
- [`climatico/SUBMIT.md`](climatico/SUBMIT.md) — hackathon submission payload
- [`hack-watch/`](hack-watch/) — what's happening on the event floor right now

**Shortest honest summary:** Climatico's own agents investigate a company on
their own and follow up — that's the point, not a form other agents fill out
for approval. Everything they find or do lands as a permanent receipt, whether
it's a commit or a flag. Compute, freight, and trace are real pipelines today —
including Orepath's actual product, not just its own footprint; the rest is
honestly labelled as estimation. We ship what runs, and we say what we haven't.
