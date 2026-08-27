/** Impact cascade per business source + modeled abatement path. Shared by the desk, get_insights, MCP, and the abate write. */

export type ImpactRow = {
  id: string;
  name: string;
  scope: string;
  modeledT: number;
  uncertaintyPct: number;
  category: string; // the modelled core: CO2e. Water/air/waste stay upstream, labelled not scored.
  upstream: string; // where the impact is actually felt (water, NOx/PM, mining, e-waste…)
  alternative: string; // run the same business a different way
  lever: string; // modelled abatement lever
};

export const IMPACT_ROWS: ImpactRow[] = [
  {
    id: "compute",
    name: "Cloud & AI compute",
    scope: "Scope 3 · Cat 1",
    modeledT: 8.5,
    uncertaintyPct: 30,
    category: "CO2e (modelled)",
    upstream: "datacentre power + cooling water",
    alternative: "carbon-aware scheduling; move batch to a low-carbon region",
    lever: "largest share of compute",
  },
  {
    id: "logistics",
    name: "Logistics",
    scope: "Scope 3 · Cat 4 & 9",
    modeledT: 12.0,
    uncertaintyPct: 35,
    category: "CO2e (modelled)",
    upstream: "freight diesel → local NOx & PM air",
    alternative: "Oakland → rail / intermodal; route optimisation",
    lever: "biggest lever · PO write next",
  },
  {
    id: "electricity",
    name: "Purchased electricity",
    scope: "Scope 2 · location-based",
    modeledT: 5.6,
    uncertaintyPct: 15,
    category: "CO2e (modelled)",
    upstream: "location-based grid mix",
    alternative: "cleaner utility or on-site solar (a bill makes it measured)",
    lever: "moves class to measured",
  },
  {
    id: "travel",
    name: "Travel & commuting",
    scope: "Scope 3 · Cat 6 & 7",
    modeledT: 4.8,
    uncertaintyPct: 25,
    category: "CO2e (modelled)",
    upstream: "aviation contrails",
    alternative: "virtual-first; rail over air where it fits",
    lever: "per-trip cut",
  },
  {
    id: "hardware",
    name: "Hardware & electronics",
    scope: "Scope 3 · Cat 2",
    modeledT: 3.2,
    uncertaintyPct: 40,
    category: "CO2e (modelled)",
    upstream: "mining + e-waste end-of-life",
    alternative: "remanufactured units; extend refresh beyond 4 years",
    lever: "longer device life",
  },
  {
    id: "saas",
    name: "Vendors & SaaS",
    scope: "Scope 3 · Cat 1",
    modeledT: 2.1,
    uncertaintyPct: 50,
    category: "CO2e (modelled)",
    upstream: "supplier electricity upstream",
    alternative: "consolidate vendors; right-size licences",
    lever: "licence-led cut",
  },
  {
    id: "direct",
    name: "Direct emissions",
    scope: "Scope 1",
    modeledT: 1.5,
    uncertaintyPct: 20,
    category: "CO2e (modelled)",
    upstream: "combustion & fugitive",
    alternative: "near zero for a cloud-only team",
    lever: "—",
  },
];

export function impactForSource(source?: string): ImpactRow {
  const q = (source ?? "").trim().toLowerCase();
  if (q) {
    const hit =
      IMPACT_ROWS.find((r) => r.id === q) ||
      IMPACT_ROWS.find((r) => q.includes(r.name.toLowerCase())) ||
      IMPACT_ROWS.find((r) => r.name.toLowerCase().includes(q));
    if (hit) return hit;
  }
  return IMPACT_ROWS[0];
}

export type AbatementQuarter = { label: string; arrM: number; defaultT: number; climaT: number };

export type Abatement = {
  nowT: number;
  quarters: AbatementQuarter[];
  reductionT: number;
  reductionPct: number;
};

/** Modeled projection: same revenue, two operating paths. A projection, clearly labelled — not a measured cut. */
export const ABATEMENT: Abatement = {
  nowT: 37.7,
  quarters: [
    { label: "Now", arrM: 1.8, defaultT: 37.7, climaT: 37.7 },
    { label: "+6m", arrM: 2.4, defaultT: 51, climaT: 42 },
    { label: "+12m", arrM: 3.2, defaultT: 68, climaT: 48 },
    { label: "+18m", arrM: 4.5, defaultT: 96, climaT: 54 },
    { label: "+24m", arrM: 6.2, defaultT: 132, climaT: 62 },
  ],
  reductionT: 70,
  reductionPct: 53,
};
