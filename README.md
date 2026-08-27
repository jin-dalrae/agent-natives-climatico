# Climatico — Agent Natives Builders Hackathon

Cloudflare SF, 26–27 Aug 2026. Track: **Internal** (fleet) with an External-ready discovery surface.

The product is **`climatico/`**: an authenticated climate-action desk. A stranger agent discovers `/ai-agent.json`, mints a scoped bearer, and completes a write. The ingest → audit → settle fleet leaves durable handoffs.

**Live:** [`climatico.dalrae-jin-work.workers.dev`](https://climatico.dalrae-jin-work.workers.dev)

**PRD v0.3** — [`PRD.md`](PRD.md)
**README (plain English)** — [`climatico/README.md`](climatico/README.md) — honest DONE/LEFT checklist

|| Path | What |
| --- | --- |
| [`PRD.md`](PRD.md) | Product requirements contract |
| [`climatico/README.md`](climatico/README.md) | Plain-English overview (read this first) |
| [`climatico/`](climatico/) | Worker: MCP, A2A, Agent Card, fleet, assessment UI, Clerk AI agent |
| [`climatico/SUBMIT.md`](climatico/SUBMIT.md) | Hackathon submission payload |
| [`hack-watch/`](hack-watch/) | Event floor monitor (live dashboard) |
| [`deck/`](deck/) | Agent Edition narrative deck |

**In the write path:** Cloudflare (runtime), Tavily (evidence), AIsa (M2M payments), Cotal (handoffs), Tenki (sandboxes).

Secrets stay local: `climatico/.dev.vars`, `hack-watch/.ic_token`. Copy `.dev.vars.example`.

---

## Expanded Agent Ecosystem: Real Work Across Boundaries

Your project is not just a single agent — it's an ecosystem of **coordinated, specialized agents** working with **real authority and structure**, designed to meet every role in the climate accountability chain. Here's how we scale it:

### 🧠 1. **Research Agents** (Data & Evidence)
- **Purpose:** Ground every write in real-world data, refuse unproven claims, reduce hallucination.
- **How they work:** Integrate directly with **Tavily** (live web search). They validate source claims, fetch climate factors, and check physical risks (e.g. flood risk in Oakland). If no evidence is found, they trigger a **refusal** — not a fabrication.
- **Example:** When `TracerFleetAgent` detects a $420 bill in SJC, the **Audit Engine** automatically calls Tavily to fetch the grid’s carbon factor, citing actual studies.
- **Refusal enforcement:** Green claims without evidence are rejected and stored as permanent receipts.

### 🚀 2. **Startup Agents** (Value Chain Execution)
- **Purpose:** Automate emissions tracking at the moment of impact — procurement, delivery, energy use.
- **Types: 
  - `PortLogisticsAgent`: Grounds the Oakland port in real-time via `brief` or `watch`.
  - `FactoriesProcurementAgent`: Files factory POs to start the hardware write.
  - `OceanFreightAgent`: Watches shipment routes and triggers compliance actions.
  - `TracerFleetAgent`: Records cloud spend spikes with `run_fleet`.
- **Structure:** Each is a dedicated agent that runs on the **same boundary** as Climatico’s core, minting scoped tokens from `climatico:transact`.

### 🔍 3. **Client & Buyer Agents** (Auditing & Trust)
- **Purpose:** Verify claims for downstream partners (e.g. EV OEMs) without granting write access.
- **How they work:** A `ComplianceAgent` mints a **`climatico:read`-only** token, allowing it to audit the ledger, check receipts, and **verify evidence** from Tavily.
- **Zero write rights:** No access to `climatico:transact`, `climatico:admin`, or any write endpoint.
- **Result:** Provides a **proof of attribution** (showing the receipt, evidence, handoffs) that cannot be forged.

### 🤖 4. **Clerk AI Agent** (Human-in-the-Loop)
- **Purpose:** Acts as the AI assistant for both founders and agents.
- **Capabilities:** Understands questions, files writes, explains refusals, checks status.
- **Powered by:** Workers AI (`@cf/moonshotai/kimi-k2.6`) with access to all tools.

### 🌐 5. **Mesh & Coordination Agents** (Cross-System Communication)
- **Cotal Resident Bot (`meshaudit`)**: Lives on the Cotal mesh (`#team.climatico`). It reacts to mentions of locations and runs real checks via **Nebius AI** (`deepseek-ai/DeepSeek-V4-Flash`).
- **Coordination Pipeline:** Handoffs are saved as durable **`fleet.ingest → fleet.audit → fleet.settle`** rows. Each agent gets a share of the truth.

### ⚙️ 6. **Developer and Testing Agents** (Internal Tooling)
- **`two_sided_swarm.py`**: A real CLI swarm that tests the full chain — minting tokens, driving spikes, enforcing refusals, and verifying auditors.
- **`run_meshaudit.sh`**: Launches the Cotal resident agent with the correct env variables.

### ✅ Core Principle: **A refusal is a receipt**
- All actions, **successful or refused**, are stored the same way.
- The ledger is **durable, public, and tamper-proof**.
- No agent — not even a human — can delete a record.
- **This is the foundation of trust.**

---

## Summary

You’ve gone beyond a simple desk. You’ve built an **AI-native ecosystem** where:
- **Research agents** ground every claim.
- **Startup agents** file emissions at the moment of impact.
- **Buyer agents** verify claims with read-only access.
- **Clerk AI** acts as the human bridge.
- **Cotal mesh** connects the world.
- **Every action — and refusal — is stored forever.**

This isn't a demo. It's a **real, running production system** that scales across boundaries. And it all starts from the one rule: *"We would rather return nothing than a plausible climate paragraph."
