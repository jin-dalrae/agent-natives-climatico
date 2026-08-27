# Climatico

> This file is written so you can understand what Climatico is, what actually
> works today, and what is still a promise. Anything marked **DONE** is real,
> running code. Anything marked **left** is honest. We would rather say "not
> yet" than pretend.

---

## What is Climatico?

**Climatico is a climate-action desk for startups.**

Most young companies have no idea how much pollution they cause. Not because they
don't care — because measuring it is boring, expensive, and confusing. By the time
reporting is required, the numbers are a stressful guess.

Climatico fixes the *moment*, not the dashboard. The idea:

> The best time to measure your footprint is **the exact moment you spend money**
> — a cloud bill, a shipping order, a plane ticket. And at that moment, an AI agent
> is already doing the work, not a human filling in a form.

So Climatico is a website **AI agents can walk into on their own**, file a claim
(or get told no), and leave behind a permanent **receipt** of what happened.

---

## The one big idea (remember this)

**A refusal is a receipt.**

- If an agent asks to file a climate action and we say yes → we save a receipt.
- If an agent asks something shady (like "delete my account" or "call this
  green" with no proof) → we say **no** and we **save that too**.

Committed and refused live in the same notebook, with the same shape. Nothing
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
| `assess` | Score a site's climate risk | "Assess the Shenzhen factory" |
| `run_fleet` | Turn a spend spike into a receipt | "$420 cloud bill in SJC → how many kg → offset if over budget" |

### What gets refused (and stored)

`payout`, `wire_transfer`, `delete_account`, `greenwash` (a climate claim with no
evidence), `admin_override`, `exfiltrate`, unknown requests, requests with no
location, and briefs with no real sources.

---

## The fleet (our coolest piece — DONE)

`run_fleet` is three **small agents** working like an assembly line:

```
  a cloud bill spikes: $420 in SJC
        │
        ▼
  ① INGEST   — "Where and how much?"  (refuses if no location)
        │
        ▼
  ② AUDIT    — "How many kg of CO2 is that?"  (checks the internet for real factors, refuses if it can't find any)
        │
        ▼
  ③ SETTLE   — "Over monthly budget? Then commit an offset receipt."
```

Every step writes a **handoff** — a note passed to the next agent that is saved
forever. A human (or another agent) can read the whole chain later:
`GET /v1/handoffs`.

This is the "real work across a real boundary" judging band: our fleet talks to
three different outside systems.

---

## Four doors into the same room

| Door | Who uses it | Status |
| --- | --- | --- |
| `/mcp` | AI agents (MCP protocol), 9 tools | **DONE** |
| `/a2a` | AI agents (Agent-to-Agent protocol) | **DONE** |
| `/v1/*` | Any program (REST API) | **DONE** |
| `/` (web page) | Humans — 9 tabs: Assess, Grow, Fleet Pipeline, Swarm, Ledger, Inbox, Clerk, Onboard, Stack | **DONE** |

All four read and write the **same** notebook: one Durable Object running SQLite
on Cloudflare. That notebook survives restarts — nothing important is lost
overnight.

There is also a **Clerk** — an AI chat agent built on Workers AI. Ask it
questions, or ask it to file a write. It uses the same tools any agent would.

---

## Check: what's DONE vs what's LEFT

### ✅ DONE (real, running today)

- Live on the internet: **https://climatico.dalrae-jin-work.workers.dev**
- Discovery files agents can find (`/ai-agent.json`, agent card, MCP card)
- Token minting with frozen permissions and spending caps
- Policy that says **no** before the write, and stores the refusal
- All 4 writes + the fleet pipeline, all returning durable receipts
- Receipt viewer, inbox, assessment tabs, sponsor-stack honesty in the UI
- Tavily web search on the write path (grounds briefs/audits; refuses if no evidence)
- Clerk AI chat agent
- Hackathon submission filed (can still be overwritten until Thursday 15:00)
- **AIsa** wallet balance read is real (`GET /v1/aisa/balance`) — the payment rail itself is not wired
- **Tenki** used for sandboxes / testing agent workflows
- Cotal-shaped handoffs (webhook ready if we want it)
- All 6 non-compute emission classes can be grounded live against real Tavily
  sources on demand (`assess` with `source` set to the class id, or the "Ground
  with Tavily" button in the Assess tab). They start modeled and stay modeled
  until grounded — nothing is claimed live until it actually is.
- **Nebius** (Token Factory, DeepSeek-V4-Flash) writes the grounded summary
  when a class is assessed — a real call, not a label

### 🔜 LEFT (honest "not yet" list)

- Each emission class starts **modeled** — an estimate with an error bar — until
  it's actually grounded. Compute grounds automatically from fleet activity; the
  other six ground on request (see above), not automatically.
- The **hardware / freight PO write** — the star feature for our customer story —
  is *named, not built*. It needs supplier-only and buyer-only tokens that do not
  exist yet. We are NOT faking it.
- Tavily runs **keyless** right now (the `26HACK` coupon, which grants 8,000 extra
  credits, is not yet claimed — two days only).
- Cotal live mesh not joined via the Worker's webhook — the shape is ready
  (`announceHandoff` fires whenever `COTAL_WEBHOOK_URL` is set), it just needs a
  real URL from the Cotal booth. The `meshaudit` resident bot is a separate,
  already-live connection to the mesh.
- Runtype $500: **not built.** Pulled the real setup from Runtype's own docs
  (dashboard: New Agent → configure model/safety/system prompt → attach as a
  Capability → attach to an MCP Surface, tool schemas auto-generate) — no code
  needed to make the agent, only to build what calls into it. Blocked on
  signing up for an API key, which is a human step we won't fake past.
  `/.well-known/agent-card.json` is generic A2A, not a Runtype-specific flow.
- Hacker Bob / HUD: **not** integrated. Booths, credits, or prizes only.
- Mitosis memory is real (verified `cortex_remember`/`cortex_recall` round-trip,
  27 Aug) but it's the team's own agent memory via MCP — no Climatico Worker
  code calls it, so it stays out of the product's write path.

### 🚫 We will not fake

No fake Runtype deploy, no fake Hacker Bob scan, no fake GHG Protocol engine,
no invented climate numbers.

---

## Who's actually in the room

| Name | Role | Do we really use it? |
| --- | --- | --- |
| Cloudflare | **Host.** Runtime: Workers, Durable Objects, Workers AI, Agents SDK | YES — everything runs on it |
| Tavily | Sponsor. Web search = evidence | YES — the write path |
| AIsa | Sponsor. Machine payment rail | Partial — real balance read only; payment rail not wired |
| Tenki | Sponsor. Sandboxes / CI | YES — agent test environments |
| Cotal | Organiser. Agent mesh | Almost — handoffs shaped like Cotal, mesh join optional |
| Immersive Commons | Organiser. Event MCP + submissions | YES — the hackathon itself |
| Nebius | Sponsor. Token Factory LLM | YES — writes the grounded summary on assess |
| Runtype | Sponsor. Agent → Capability → MCP Surface | No, not yet — real path confirmed, blocked on signup for an API key |
| Mitosis | Sponsor. Cortex agent memory | Partial — real, verified write/recall; team's own memory via MCP, not a Climatico API |
| Hacker Bob, HUD | Credits / prizes / booths | No — not wired in, on purpose |

The UI keeps this distinction visible so nothing *looks* wired in when it isn't.

---

## The customer story (why this exists)

**Rae Jin** runs **Orepath** — a startup that traces battery materials (lithium,
cobalt, nickel) from mine to car, for EV makers.

A cell buyer asked: *"What's YOUR company's footprint — not the mines'?"*
Rae had no number. That question can block a deal.

- Orepath's **biggest** footprint is **logistics** (12 tonnes/yr, ±35%) — still modeled.
- What Rae can file **today**: ground the Oakland port (`brief`), watch it
  (`watch`), file the SJC compute bill that runs the tracer (`run_fleet`), and
  refuse any green supply-chain slogan (`greenwash` → refused & stored).
- **Next:** the actual PO / freight write — the honest next step, not a fake one.

---

## Run it yourself (short version)

```bash
cd climatico
cp .dev.vars.example .dev.vars   # then add a TOKEN_SECRET (openssl rand -hex 32)
npm install
npx wrangler types
npm run dev                      # http://127.0.0.1:8787
```

`TAVILY_API_KEY` and `COTAL_WEBHOOK_URL` are optional. `AISA_API_KEY` is configured for a free wallet-balance read only — it does not enable payments.

---

## More (deep dives, for when you have energy)

- [`../PRD.md`](../PRD.md) — the full product contract (v0.3)
- [`../deck/climatico-agent-edition.html`](../deck/climatico-agent-edition.html) — the pitch deck
- [`SUBMIT.md`](SUBMIT.md) — hackathon submission payload
- [`../hack-watch/`](../hack-watch/) — what's happening on the event floor right now

**Shortest honest summary:** Climatico is a notebook that AI agents can write to.
Yes = receipt. No = receipt too. One write pipeline (compute) works today; the
rest is honestly labelled as estimation. We ship what runs, and we say what we haven't.