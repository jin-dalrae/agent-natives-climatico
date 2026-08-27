# Climatico — Live Demo Scenario & CLI Walkthrough

> **Product Contract:** Ingest business activity, calculate CO₂e impact, discover greener alternatives, and settle or refund commitments.
> **Live App:** [`https://climatico.dalrae-jin-work.workers.dev/app`](https://climatico.dalrae-jin-work.workers.dev/app)
> **Demo Scenario Tab:** [`https://climatico.dalrae-jin-work.workers.dev/app?tab=demo`](https://climatico.dalrae-jin-work.workers.dev/app?tab=demo)

---

## 1. The Customer Scenario

* **The Customer:** Rae Jin runs **Orepath**, a startup tracing battery materials (lithium, cobalt, nickel, graphite) from mine to cell for EV manufacturers.
* **The Spark:** An EV battery buyer asked: *"What is your own company's carbon footprint — not the mines'?"* Rae had no number, which blocked the deal.
* **The Reality:** Orepath's biggest footprint is **logistics** (12 tonnes/yr), followed by **cloud compute** (8.5 tonnes/yr). Her team already manages operations and cloud infrastructure through **AI agents**, not manual spreadsheets.
* **The Solution:** Climatico provides an agentic write surface that hooks into operational moments (spend spikes, shipping bookings, region choices) to calculate footprint, find greener alternatives, and settle or refund offsets.

---

## 2. Step-by-Step Demo Walkthrough

### Step 1: Agent Authentication & Frozen Scopes

A stranger agent discovers `https://climatico.dalrae-jin-work.workers.dev/ai-agent.json` and mints a scoped machine bearer token. Scopes and spending limits freeze permanently at mint time.

```bash
./bin/orepath mint
```

#### Terminal Output:
```
Minting token for 'orepath-supply-tracer' with scopes ["climatico:read", "climatico:transact"]...
Token saved to /Users/dalrae/.../orepath-work/.token (chmod 600).
Scopes: ['climatico:read', 'climatico:transact']
Ceiling: $50.00

Try: orepath whoami
     orepath fleet SJC 420
     orepath switch SJC "FRA clean grid"
```

Verify the key is active:
```bash
./bin/orepath whoami
```
```
Subject: orepath-supply-tracer
Intent: brief
Status: committed
Flag: —
```

---

### Step 2: Ingest Spend & Calculate Emissions (Hero Flow)

Orepath's battery supply tracer compute spikes to **$420** in San Jose (`SJC`). The fleet pipeline executes 3 agents:
1. **Ingest Agent** (`fleet.ingest`): Validates region and spend amount.
2. **Audit Agent** (`fleet.audit`): Scores emissions using 5 live Tavily web citations (**189 kg CO₂e**), and detects **+179 kg over monthly budget**.
3. **Settle Agent** (`fleet.settle`): Commits a **$35.80 offset receipt** on the Durable Object SQLite ledger.

```bash
./bin/orepath fleet SJC 420
```

#### Terminal Output:
```
Running fleet: $420 @ SJC (budget: 50kg, MTD: 40kg)...
Status: committed
Score: 189 kg · Over budget: 179 kg · Grounded: True
Offset: 35.80 USD · Receipt: 0fe65272
Handoffs: 3 (ingest → audit → settle)
```

> **Check in browser:** Open [`/app`](https://climatico.dalrae-jin-work.workers.dev/app) → `Committed` count and `Fleet Runs` count increment live!

---

### Step 3: Calculate Logistics & Freight Leg

Logistics is Orepath's largest class (12 tonnes/year). File an actual shipping shipment of 8,000 kg battery material across 11,000 km sea freight:

```bash
./bin/orepath freight "Shenzhen -> Oakland" sea 8000 11000
```

#### Terminal Output:
```
Filing freight leg 'Shenzhen -> Oakland' (sea, 8000kg x 11000km)...
Status: committed
Receipt: 8937c9aa
Footprint: 1,320 kg CO₂e (sea mode: 0.015 kg/t·km)
Note: sea freight · 8000kg over 11000km (88.0 tonne-km)
```

---

### Step 4: Discover Greener Alternatives (Abatement Research)

Ground the climate factors and greener alternatives for the Oakland port using live Tavily research:

```bash
./bin/orepath brief "Oakland port"
```

#### Terminal Output:
```
Filing climate brief for 'Oakland port'...
Status: committed
Sources: 5
Evidence: Port of Oakland Clean Air Plan, zero-emission drayage truck transition
Alternative: Shift Oakland port drayage to electrified rail / intermodal routing
```

---

### Step 5: Switch to Green Alternative & Claim Offset Refund

Orepath acts on the abatement recommendation: moving tracer batch compute from high-carbon San Jose (`SJC`) to clean-grid Frankfurt (`FRA`). 

The new footprint requires only **$5.00** of offset, and Climatico automatically files a **$30.80 refund claim** on the prior $35.80 offset:

```bash
./bin/orepath switch SJC "FRA clean-grid datacenter" 0fe65272 3580 500
```

#### Terminal Output:
```
Logging solution switch at 'SJC'...
Status: committed
Transition: SJC high-carbon → FRA clean-grid datacenter
Prior Offset: $35.80 USD (Receipt 0fe65272)
New Commitment: $5.00 USD
Offset Refund: +$30.80 USD claimable (net emissions reduced!)
```

Or claim the refund directly:
```bash
./bin/orepath refund SJC 0fe65272 3580 500
```

---

### Step 6: Privacy-Preserving Business Signal Scan

Auto-assess a startup project directory without sending code, secrets, or file contents:

```bash
./bin/orepath connect . --dry-run
```

#### Terminal Output:
```
  ┌────────────────────────────────────────────────────────────────┐
  │  PRIVACY — what stays on YOUR machine vs. what leaves it         │
  ├────────────────────────────────────────────────────────────────┤
  │  STAYS LOCAL: File contents of package.json, wrangler, README │
  │  SENT TO CLIMATICO: Derived metadata signals only             │
  └────────────────────────────────────────────────────────────────┘

Scanning . (file contents never leave this machine)...
  + cloud · Cloudflare Workers (extracted from wrangler.jsonc)
  + logistics · README mentions shipping

→ 1 derived signal, 170 bytes (0 file contents sent)
```

---

## 3. Summary of Key CLI Commands

| Command | What it does | Expected Result |
|---|---|---|
| `./bin/orepath mint` | Mint scoped machine token | Token saved to `orepath-work/.token` |
| `./bin/orepath whoami` | Verify token credentials | Scopes & permissions printed |
| `./bin/orepath fleet SJC 420` | Calculate compute emissions & settle offset | 189 kg CO₂e scored, $35.80 offset committed |
| `./bin/orepath freight <lane> <mode> <kg> <km>` | Calculate freight emissions | Exact kg CO₂e recorded on ledger |
| `./bin/orepath switch <loc> <newSol> <id> <prior¢> <new¢>` | Switch to green alternative & refund | Prior offset refunded, new commitment logged |
| `./bin/orepath refund <loc> <id> <prior¢> <new¢>` | Claim refund on prior offset | Delta refund receipt issued |
| `./bin/orepath brief "Oakland port"` | Ground location with Tavily | 5 live sources & green suggestions |
| `./bin/orepath connect . --dry-run` | Privacy-preserving auto-assessment | Derived signals JSON printed |
| `./bin/orepath receipts 5` | Show recent ledger receipts | Last 5 receipts from SQLite DO |
| `./bin/orepath handoffs` | View agent-to-agent pipeline log | Ingest → Audit → Settle chain |
