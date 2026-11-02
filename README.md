# Climatico

**Understand a company's climate impact from its earliest stage, anticipate what changes as it scales, and use agents to make better decisions before those impacts grow.**

Climatico's vision is to calculate GHG emissions and other relevant environmental impacts from real company operations, build the information a larger company will need from the beginning, and help teams act before high-impact choices become difficult to change.

A small company's decisions about infrastructure, suppliers, energy, logistics, and product design can become much larger commitments as it grows. Climatico should connect those decisions to their environmental consequences: what the company causes today, what its planned growth could cause, and what it can change now.

**Status: working prototype with substantial workflow gaps.** This repository contains agent interfaces, a web workspace, research tools, and a durable action ledger. It does **not yet implement the complete workflow below**. Current demo totals, simulated activity, heuristic calculations, and preset growth curves must not be presented as a company's actual footprint or a company-specific forecast.

## The complete workflow we are building

```text
Define the company and reporting boundary
                  ↓
Collect actual operating data and preserve its sources
                  ↓
Calculate GHG emissions and assess other relevant impacts
                  ↓
Find hotspots, missing data, and decisions coming up
                  ↓
Project impacts under explicit growth scenarios
                  ↓
Compare alternatives and choose an action before scaling
                  ↓
Carry out the action through the company's workflow
                  ↓
Collect subsequent operating data and check the outcome
                  ↺
```

The workflow must cover **electricity, cloud infrastructure, and freight**, then extend to other material sources: fuels, travel, purchased goods and services, hardware, facilities, waste, and product or supply-chain activities where applicable. One cloud bill cannot represent the whole company.

### 1. Define what belongs to the company

Establish the organization, sites, accounts, operations, reporting period, and relevant value-chain activities. Identify which sources belong in the inventory, where records overlap, and which sources are missing.

Start with the data an early-stage team can actually provide. Preserve its history and calculation methods so the inventory can become more complete as the company grows. A partial inventory must show its coverage; it must not appear to be a complete company footprint.

**Needs work:** company onboarding, organizational boundaries, reporting periods, source coverage, and secure company workspaces. The current Orepath example is a demo story, not a general company onboarding flow.

### 2. Collect real operating data

Support both data/document imports and direct connections to company systems.

| Source | Actual input needed | What must remain traceable |
| --- | --- | --- |
| Electricity | Utility bills or meter readings, kWh, site, dates; contractual energy information where applicable | Bill or meter reference, location, period, units, and accounting method |
| Cloud | Provider carbon reports and relevant usage records, account/project, service, region, dates | Provider report, reporting coverage, methodology, and allocation to the company |
| Freight | Shipment records, carrier, mode, weight, route/distance, dates; carrier emissions reports where available | Shipment or booking reference, transport legs, inputs, and calculation method |
| Other material sources | Fuel purchases, travel records, procurement, equipment, waste, and relevant supplier/product records | Original source, ownership, dates, units, category, and exclusions |

Preserve source references, detect duplicate imports, validate units and dates, support corrections, and track missing or stale data. Finding a vendor name in a repository is a clue about where to request data; it is not evidence of consumption or emissions.

**Needs work:** real ingestion for electricity, cloud, and freight; provider connections; source-document handling; normalization; reconciliation; and correction workflows. The existing folder scanner discovers metadata signals. The scheduler and compute watcher currently generate simulated spend and locations rather than reading company accounts.

### 3. Calculate current GHG emissions

Use actual activity with an applicable, traceable emissions factor, or an attributable supplier/provider emissions report. Preserve the inputs, units, factor value, source, version/year, geography, and methodology. Support the relevant Scope 1, 2, and 3 categories and prevent duplicate attribution.

Keep these distinctions visible:

- **Recorded activity:** what a bill, meter, usage export, or shipment record says happened.
- **Calculated emissions:** emissions derived from that activity using a documented method and applicable factors.
- **Provider-reported emissions:** figures supplied by a provider, with its methodology and coverage identified.
- **Missing data:** an unresolved gap, never replaced by a fabricated company total or silently counted as zero.

Calculated or provider-reported emissions must not be called directly measured emissions unless the source supports that description. A web citation alone does not validate company activity, establish the correct factor, or make a number measured.

**Needs work:** a structured emissions inventory and reproducible calculation engine tied to source records. The current compute pipeline multiplies spend by a fixed `0.45 kgCO₂e/USD`; freight uses hardcoded factors by mode. Searching for supporting pages does not replace these heuristics with a validated calculation. The seven category totals are preset demo values.

### 4. Assess other relevant environmental impacts

GHG is the core inventory, but the product should also identify impacts relevant to the company's operations, sector, locations, customers, and reporting needs as it grows.

Potential areas include water use and local water stress, air pollution, material and resource use, waste and e-waste, and land or biodiversity impacts. They need their own data, methods, units, and geographic context. They must not be collapsed into an unsupported single climate score.

For each relevant impact, show what can be quantified, what can only be described with evidence, and what still needs data or specialist assessment. Determine applicable reporting needs for the particular company; do not assume every metric or obligation applies to every larger business.

**Needs work:** impact-specific data collection, calculation/assessment methods, relevance assessment, and mapping to applicable reporting requirements. The current app names some upstream impacts but does not quantify them.

### 5. Forecast what happens as the company scales

Build scenarios from the company's actual baseline and explicit operating assumptions: headcount, production, shipments, compute workload, facilities, suppliers, regions, energy sources, and planned changes.

Compare a continuation of current practices with specific alternatives. Show absolute impacts and useful intensity measures, alongside the assumptions, data gaps, time horizon, and uncertainty. Forecasts should update when actual data or company plans change.

**Current results and future scenarios are different outputs.** A projection is a conditional forecast, not a measured future result. It must not use an invented current footprint or imply that revenue alone determines emissions.

**Needs work:** company-specific growth inputs, driver-based projections, scenario comparison, sensitivity analysis, and forecast-versus-actual checks. The current growth curves and abatement trajectories are preset examples, including revenue-scaled projections; they are not forecasts built from connected company operations.

### 6. Make better decisions before impacts grow

Agents should identify decisions with environmental consequences before a company commits: selecting a cloud region, renewing a supplier contract, adding a facility, choosing a transport mode, purchasing equipment, or designing a production process.

For each decision, compare feasible alternatives using the company's real data and explicit scenario assumptions. Include relevant costs, operational constraints, expected environmental effects, evidence, uncertainty, and tradeoffs across impacts. Identify the decision owner and when a decision is needed.

The useful output is a concrete recommendation connected to a business decision, with enough evidence for the team to act on it.

**Needs work:** decision triggers from real business systems, company-specific alternative evaluation, cost/impact comparisons, owners, deadlines, and a tracked decision process. Existing research can suggest alternatives, but recording a suggestion does not establish its suitability or savings.

### 7. Carry out and track the action

Connect the chosen action to a real task, procurement request, infrastructure change, supplier process, or other operational workflow. Track an owner, status, deadline, authorization appropriate to the action, and evidence of implementation.

Distinguish an action proposed, an action chosen, an action in progress, and an action implemented. A ledger entry saying “switch” must not imply that the company has actually switched providers, regions, or transport modes.

Offsets, if supported, belong in a separate record with transaction and retirement evidence. They must not silently reduce gross emissions or substitute for operational reductions. A reduction in emissions does not by itself establish a right to an offset refund.

**Needs work:** action lifecycle, execution integrations, implementation confirmation, and real transaction/retirement evidence for any offset feature. The current switch/refund paths mainly record submitted information; the provider agent generates internal fulfillment records. These are not proof of an operational change, payment, refund, or retired credit.

### 8. Check the outcome and keep the record useful

Collect subsequent real operating data, calculate impacts consistently, and compare results with the baseline and forecast. Explain changes in business volume, boundaries, factors, and methods so a difference is not automatically attributed to the action.

Keep sources, calculations, decisions, implementation evidence, and follow-up results linked. Produce reports that show coverage, unresolved gaps, methods, actual outcomes, and forecasts separately. This history should support customer questions and more demanding reporting as the company grows.

**Needs work:** comparable reporting periods, baseline/version management, outcome checks, forecast reconciliation, and source-linked reporting/export. The current report summarizes ledger activity; it is not a complete company emissions or environmental-impact report.

## What agents are for

Agents should help maintain the workflow: request missing records, process incoming data, surface hotspots, update scenarios, research alternatives, bring decisions forward, coordinate actions, and check results.

Their value comes from acting on real operational signals and carrying work across these steps. Running on a timer, producing climate prose, or writing a receipt is not enough to demonstrate that workflow.

Policy checks validate supported commands, permissions, locations, and inputs, and record issues for audit. The current code does not evaluate arbitrary company statements and determine whether they are true. Product-facing issues should explain what data or evidence is missing, what needs attention, and how to resolve it.

## What exists in this repository

These are implemented prototype building blocks, not a claim that the complete product is operational.

| Building block | Current implementation | Limit |
| --- | --- | --- |
| Web workspace | React views for assessment, abatement, ledger/pipeline, and Clerk chat | Includes demo company data, preset totals, and illustrative flows |
| Durable ledger | Cloudflare Durable Object with SQLite receipts, handoffs, runs, and connection records | Stores submitted/generated records; storage alone does not verify their real-world accuracy |
| Agent interfaces | REST, MCP, A2A, discovery files, and CLI | Interface availability does not establish complete accounting or action execution |
| Credentials and policy | Scoped bearer credentials and request checks | Secure company identity, membership, tenant isolation, and production authorization need work; public demo credential minting is not company authentication |
| Research | Gemini search grounding with a Tavily fallback | Collects references; does not validate company activity or automatically establish an applicable factor |
| Compute pipeline | Ingest → audit → settle, with persisted handoffs | Spend heuristic; scheduled inputs are simulated; no real billing connection |
| Freight records | Accepts mode, weight, and distance and records a calculation | Hardcoded emissions factors; submitted data is not independently verified shipment evidence |
| Material trace records | Records a submitted material lot and sourcing references | Separate from the company's own footprint; generic references do not verify a particular lot's provenance |
| Abatement and growth views | Alternative suggestions, plans, and illustrative trajectories | No complete company-specific scenario, implementation, and outcome loop |
| Clerk | AI chat using the ledger's tools | Inherits the same data and execution limits as those tools |

### Implementation priorities to complete the workflow

1. Establish secure company workspaces, reporting boundaries, periods, and source coverage.
2. Ingest and reconcile real electricity, cloud, and freight records, preserving sources and corrections.
3. Replace heuristic/demo totals with reproducible calculations and attributable provider reports; expose missing data.
4. Add relevant non-GHG impact methods and identify company-specific reporting needs.
5. Build growth scenarios from actual baselines and explicit operating drivers.
6. Connect recommendations to owned decisions and real implementation workflows.
7. Check subsequent actuals, reconcile forecasts, and export source-linked reports.

## Repository and development

The project originated at the Agent Natives Builders Hackathon in San Francisco. Its original demo centers on Orepath, a battery-material tracing startup. That scenario illustrates the problem; the intended product serves companies from early operations through scale.

| Path | Contents |
| --- | --- |
| [`climatico/`](climatico/) | Cloudflare Worker, React workspace, agents, and CLI |
| [`climatico/src/fleet.ts`](climatico/src/fleet.ts) | Current compute-spend pipeline and heuristic |
| [`climatico/src/graph.ts`](climatico/src/graph.ts) | Action recording, freight calculations, switch/refund paths |
| [`climatico/src/impact.ts`](climatico/src/impact.ts) | Preset impact rows and abatement trajectory |
| [`climatico/src/insights.ts`](climatico/src/insights.ts) | Demo company story, category totals, and growth scenarios |
| [`climatico/src/ledger.ts`](climatico/src/ledger.ts) | Durable SQLite storage |
| [`climatico/src/server.ts`](climatico/src/server.ts) | Routes and scheduled demo activity |
| [`climatico/src/orepath-agent.ts`](climatico/src/orepath-agent.ts) | Simulated compute-watcher activity |
| [`climatico/climatico.sh`](climatico/climatico.sh) | CLI and local folder metadata scan |
| [`PRD.md`](PRD.md) | Earlier prototype requirements; not yet reconciled with this vision |
| [`climatico/public/deck.html`](climatico/public/deck.html) | Existing demo deck; not yet reconciled with this vision |

The prototype is configured for [this demo deployment](https://climatico.dalrae-jin-work.workers.dev). Deployment availability and service connections are not verified by this README.

The stack uses React, TypeScript, Vite, Cloudflare Workers, Durable Objects/SQLite, the Cloudflare Agents SDK, and Gemini, with Tavily as a research fallback. Some earlier hackathon integrations have local fallbacks; they must not be presented as connected external services without checking their configuration and behavior.

### Run the prototype locally

```bash
cd climatico
cp .dev.vars.example .dev.vars
# Set TOKEN_SECRET and the API keys needed for the features you use.
npm install
npx wrangler types
npm run dev
```

Open the local URL printed by Vite, then `/app`. This runs the existing prototype, including its demo behavior. It does not activate the missing workflow described above.

Keep secrets in local configuration. The current folder scanner is intended to send metadata signals rather than file contents. Real operational-data ingestion will need an explicit data-handling design; the earlier scanner's privacy description is not a blanket promise about future document or provider integrations.
