# Climatico PRD

**Version:** 2.0 · **Date:** 14 November 2026
**Previous:** v1.0 (27 August 2026) was the Agent Natives hackathon contract. It is preserved in git history. This document is the product contract now.

Climatico won 1st place, Internal tools track, at the Agent Natives Builders Hackathon (Cloudflare SF, August 2026). The hackathon-era framing and event logistics have been removed from this document. What remains is the product story: customer, product, evidence, and gaps.

---

## 1. Problem

A buyer asks a startup for its emissions, and the startup has no answer. For fast-growing companies, **"which emissions are yours, and how much?"** has no product.

| Option | Why it fails this customer |
| --- | --- |
| Enterprise ESG suite | Wrong customer. Priced for a sustainability lead at Series C. |
| Cloud vendor dashboard | One vendor, one methodology. No hardware, vendors, travel, logistics. |
| Consultant PDF | Stale, unqueryable, reconstructed from invoices. |

The teams in this gap already run operations through **agents**. Attribution is cheapest **at the moment of activity** — a spend spike, a PO, a freight booking — when the systems present are agents, not forms.

---

## 2. Product

**One-liner:** When a buyer asks a supplier for emissions data, Climatico's agents collect real operating data, calculate an auditable footprint, and file the answer in hours instead of weeks.

It is **not** "a carbon dashboard with a chatbot." The screen (Assess, Grow, Fleet Pipeline, Impact & Abate, Ledger & Receipts, Inbox, Agent Clerk) is how humans read the same record agents write.

**Principles:**

1. **Modeled until evidenced.** Estimates are labeled estimates; reductions count only when proven.
2. **Every figure traceable to its source.** Inputs, factors, methods, and gaps travel with the number.
3. **Unverified claims are rejected and logged,** never printed as fact.

---

## 3. Customer

**The pattern:** Orepath traces battery materials mine → cell for EV buyers. A cell buyer asked for Orepath's *own* footprint — not the mines' — and no answer could block the deal. That buyer request is the trigger.

**ICP hypothesis (to validate):** Seed–Series B suppliers to large buyers — battery/materials, hardware, manufacturing, logistics. The Climatico buyer is the founder/COO answering a customer questionnaire.

**Why now:** California SB 253 requires Scope 3 reporting from 2027 on 2026 data, so large buyers are asking suppliers for 2026 figures now. EU CSRD cascades the same requests down the value chain. See `YC-RESEARCH.md`.

---

## 4. How it works

1. **Connect real operating data** — utility bills, cloud provider reports, shipment records — and preserve sources, units, dates, and corrections.
2. **Calculate with documented factors,** or file attributable provider figures with their methodology. Estimated, calculated, and provider-reported numbers stay visibly distinct.
3. **Keep an evidence trail.** Validation runs before any write; rejected requests are logged in the same trail with their reasons. A buyer or auditor can trace any figure back to its source.
4. **Answer the buyer:** an auditable response with coverage and gaps stated, not a black-box score.
5. **Act and re-measure:** compare alternatives, track the decision, check later actuals against the forecast.

---

## 5. Shipped vs vision (honest delta)

A working prototype exists; the loop above is not fully operational. Demo totals, simulated inputs, and preset curves must not be presented as a real company footprint.

| Capability | Shipped | Gap |
| --- | --- | --- |
| Web workspace | React views (assess, grow, fleet, ledger, clerk) | Demo data, preset totals |
| Evidence trail | Durable Object SQLite receipts, handoffs, runs | Storage alone does not verify accuracy |
| Agent interfaces | REST, MCP, A2A, CLI, discovery files | Interfaces do not equal complete accounting |
| Research grounding | Live web sources with fallback | References do not validate company activity |
| Compute pipeline | Ingest → audit → settle | Spend heuristic (0.45 kg/$); simulated scheduler input |
| Freight | Mode × weight × distance calculation | Heuristic factors; submissions unverified |
| Abatement views | Suggestions, illustrative trajectories | No company-specific scenario/outcome loop yet |

**Do not ship:** fabricated company totals, uncredited "measured" labels, offset claims without retirement evidence.

---

## 6. Non-goals (now)

- Full Scope 1–3 assured accounting or product LCA.
- An offsets marketplace or net-zero marketing claims.
- Enterprise-suite positioning — the wedge is suppliers answering buyers, not sustainability leads.

---

## 7. Next

1. One real ingestion connection (cloud billing report), replacing simulated input.
2. Buyer-request → answer flow as the front-door demo.
3. Two to three paid pilots or LOIs before adding features.

---

## 8. Document map

| Artifact | Job |
| --- | --- |
| `README.md` | Vision and full workflow |
| `DEMO.md` | Live walkthrough |
| `climatico/public/deck.html` | Demo deck |
| `YC-RESEARCH.md` | Market, timing, competition, YC skeleton |
