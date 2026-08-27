import type { Dashboard, FleetRun, Handoff, Receipt } from "./types";
import { IMPACT_ROWS, ABATEMENT, type ImpactRow, type Abatement } from "./impact";

export type EmissionClass = {
  id: string;
  name: string;
  scope: string;
  modeledT: number;
  uncertaintyPct: number;
  restsOn: string;
  status: "modeled" | "live" | "refused";
  liveNote: string | null;
};

export type MaturityStep = {
  level: number;
  name: string;
  done: boolean;
  how: string;
};

export type InboxMessage = {
  id: string;
  from: string;
  channel: string;
  tone: "ok" | "no" | "wa" | "info";
  title: string;
  body: string;
  action: string;
  createdAt: number;
};

export type SponsorLink = {
  id: string;
  name: string;
  role: string;
  status: "live" | "booth" | "prize" | "host";
  insight: string;
  how: string;
  href: string;
};

export type StoryTool = {
  id: string;
  title: string;
  how: string;
  live: boolean;
};

export type FounderStory = {
  name: string;
  company: string;
  role: string;
  product: string;
  stage: string;
  spark: string;
  hotspotClass: string;
  hotspotWhy: string;
  tools: StoryTool[];
};

export type WorkspaceView = {
  dashboard: Dashboard;
  maturity: MaturityStep[];
  classes: EmissionClass[];
  impact: ImpactRow[];
  abatement: Abatement;
  abatementPlans: number;
  inbox: InboxMessage[];
  sponsors: SponsorLink[];
  next: string[];
  story: FounderStory;
  receipts: Receipt[];
  handoffs: Handoff[];
  runs: FleetRun[];
  tavilyKey: boolean;
  cotalWebhook: boolean;
  nebiusKey: boolean;
  aisaConfigured: boolean;
};

/** One user. Logistics is the agentic interface; compute is the write we can file today. */
export const OREPATH: FounderStory = {
  name: "Rae Jin",
  company: "Orepath",
  role: "Founder",
  product: "Traces battery materials (lithium, cobalt, nickel, graphite) from mine to cell, so EV makers can prove where their materials came from.",
  stage: "Seed · 14 people in SF · ~$1.8M ARR",
  spark: "A cell buyer asked: what's your own company's impact, not the mines'? She had no number.",
  hotspotClass: "logistics",
  hotspotWhy:
    "Orepath tracks other companies' freight for a living — but its own logistics footprint (12 t/yr, ±35%) is its biggest modeled class. The moment to capture it is a PO, a booking, or a port call — and an agent is already there.",
  tools: [
    {
      id: "brief-oakland",
      title: "Ground Oakland port",
      how: "Looks up real sources for Oakland port and files a grounded note.",
      live: true,
    },
    {
      id: "watch-oakland",
      title: "Watch the port",
      how: "Keeps watching Oakland port over time. Survives a restart. Still a modeled number.",
      live: true,
    },
    {
      id: "fleet-sjc",
      title: "File the tracer’s compute",
      how: "Scores the compute spend that runs the tracer, in SJC — the one class that's live today.",
      live: true,
    },
    {
      id: "refuse-greenwash",
      title: "Refuse a green chain claim",
      how: "Tries to claim a green supply chain and gets refused. The refusal is saved as proof.",
      live: true,
    },
    {
      id: "po-freight",
      title: "PO / freight write",
      how: "Next: filing the actual freight PO. Needs supplier and buyer tokens we haven't built yet.",
      live: false,
    },
  ],
};

export type OpsStage = {
  id: "build" | "sell" | "pay" | "grow";
  verb: string;
  company: string;
  moment: string;
  climatico: string;
  live: boolean;
  write?: "fleet" | "brief" | "watch" | "refuse";
};

export type GrowthQuarter = {
  label: string;
  arrM: number;
  defaultT: number;
  climaT: number;
};

/** Modeled operating story. Intensity = tCO₂e / $M ARR. Not a live ledger write. */
export const OREPATH_GROWTH = {
  nowArrM: 1.8,
  nowT: 37.7,
  customers: 11,
  pilots: 4,
  acv: "$90k–$160k",
  burnK: 195,
  stages: [
    {
      id: "build" as const,
      verb: "Build",
      company: "Ships the tracer. Cloud spend defaults to SJC. Vendor contracts renew unchecked.",
      moment: "Picking a region and running a batch job — agents already do this.",
      climatico: "Mint a token, file the compute spike, watch the region.",
      live: true,
      write: "fleet" as const,
    },
    {
      id: "sell" as const,
      verb: "Sell",
      company: "11 paying customers, 4 pilots. A cell buyer asks for Orepath's own footprint, not the mines'.",
      moment: "That question lands in an agent's inbox, not a slow PDF back-and-forth.",
      climatico: "Ground a brief with real sources. Refuse any green-chain slogan.",
      live: true,
      write: "brief" as const,
    },
    {
      id: "pay" as const,
      verb: "Pay",
      company: "Cloud invoice, freight PO, $195k/month burn. Spending is the moment that matters.",
      moment: "A bill spike or a booking — the cheapest moment to capture it.",
      climatico: "Run the fleet to settle or offset compute. The PO/freight write is next — not faked here.",
      live: true,
      write: "fleet" as const,
    },
    {
      id: "grow" as const,
      verb: "Grow",
      company: "Same Seed story: revenue up, hiring, another data room. Footprint scales with it unless intensity falls.",
      moment: "Investors will ask for tonnes per revenue dollar, not a net-zero slide.",
      climatico: "A modeled projection only. The Climatico path means filing real writes as you grow — not a forecast dressed up as measured.",
      live: false,
    },
  ],
  quarters: [
    { label: "Now", arrM: 1.8, defaultT: 37.7, climaT: 37.7 },
    { label: "+6m", arrM: 2.4, defaultT: 51, climaT: 42 },
    { label: "+12m", arrM: 3.2, defaultT: 68, climaT: 48 },
    { label: "+18m", arrM: 4.5, defaultT: 96, climaT: 54 },
    { label: "+24m", arrM: 6.2, defaultT: 132, climaT: 62 },
  ] satisfies GrowthQuarter[],
};

const BASE_CLASSES: Omit<EmissionClass, "status" | "liveNote">[] = [
  {
    id: "compute",
    name: "Cloud & AI compute",
    scope: "Scope 3 · Cat 1 Purchased goods",
    modeledT: 8.5,
    uncertaintyPct: 30,
    restsOn: "GHG Protocol ICT + Software Carbon Intensity (ISO/IEC 21031)",
  },
  {
    id: "hardware",
    name: "Hardware & electronics",
    scope: "Scope 3 · Cat 2 Capital goods",
    modeledT: 3.2,
    uncertaintyPct: 40,
    restsOn: "OEM product carbon footprints, 4-year life",
  },
  {
    id: "travel",
    name: "Travel & commuting",
    scope: "Scope 3 · Cat 6 & 7",
    modeledT: 4.8,
    uncertaintyPct: 25,
    restsOn: "UK DESNZ/DEFRA + US EPA, distance × mode",
  },
  {
    id: "saas",
    name: "Vendors & SaaS",
    scope: "Scope 3 · Cat 1 Purchased services",
    modeledT: 2.1,
    uncertaintyPct: 50,
    restsOn: "US EPA USEEIO v2 spend-based. Coarse, and labelled so",
  },
  {
    id: "logistics",
    name: "Logistics",
    scope: "Scope 3 · Cat 4 & 9",
    modeledT: 12.0,
    uncertaintyPct: 35,
    restsOn: "GLEC / ISO 14083, tonne-km × mode",
  },
  {
    id: "electricity",
    name: "Purchased electricity",
    scope: "Scope 2 · location-based",
    modeledT: 5.6,
    uncertaintyPct: 15,
    restsOn: "US EPA eGRID + IEA. A utility bill makes this measured",
  },
  {
    id: "direct",
    name: "Direct emissions",
    scope: "Scope 1 · combustion & fugitive",
    modeledT: 1.5,
    uncertaintyPct: 20,
    restsOn: "DESNZ + IPCC AR6 GWP100. Near zero for cloud-only teams",
  },
];

export function buildWorkspace(input: {
  dashboard: Dashboard;
  receipts: Receipt[];
  handoffs: Handoff[];
  runs: FleetRun[];
  tavilyKey: boolean;
  cotalWebhook: boolean;
  nebiusKey?: boolean;
  aisaConfigured?: boolean;
}): WorkspaceView {
  const { dashboard, receipts, handoffs, runs, tavilyKey, cotalWebhook } = input;
  const nebiusKey = Boolean(input.nebiusKey);
  const aisaConfigured = Boolean(input.aisaConfigured);
  const lastRun = runs[0] ?? null;
  const lastCompute = lastRun?.audit?.kgCO2e ?? null;

  const classes: EmissionClass[] = BASE_CLASSES.map((row) => {
    if (row.id === "compute" && lastCompute != null && lastRun?.audit?.grounded) {
      return {
        ...row,
        status: "live" as const,
        liveNote: `${lastCompute} kg this spike at ${lastRun.ingest.location} · Tavily ${lastRun.audit.evidence.length} sources`,
      };
    }
    return { ...row, status: "modeled" as const, liveNote: null };
  });

  const hasTokenActivity = dashboard.committed + dashboard.refused > 0;
  const hasGrounded = receipts.some((r) => r.status === "committed" && r.evidence.length > 0);
  const hasFleet = (dashboard.fleetRuns ?? 0) > 0;
  const hasOffset = receipts.some((r) => r.intent === "offset" && r.status === "committed");
  const hasWatch = dashboard.watches > 0;

  const maturity: MaturityStep[] = [
    {
      level: 0,
      name: "L0 · estimated",
      done: true,
      how: "Seven classes, each with a modeled number and an error bar. None claimed as measured yet.",
    },
    {
      level: 1,
      name: "L1 · credential",
      done: hasTokenActivity,
      how: "Mint a climatico:transact token. Its scopes lock in immediately, capped at $50.",
    },
    {
      level: 2,
      name: "L2 · grounded write",
      done: hasGrounded,
      how: "File a brief or assessment. If we can't find real sources, we refuse instead of guessing.",
    },
    {
      level: 3,
      name: "L3 · fleet",
      done: hasFleet,
      how: "Run the fleet on a spend spike: ingest, then audit, then settle. Each step is saved.",
    },
    {
      level: 4,
      name: "L4 · settlement",
      done: hasOffset,
      how: "When a spike goes over budget, it commits an offset receipt, capped by the token.",
    },
    {
      level: 5,
      name: "L5 · continuous",
      done: hasWatch,
      how: "Start watching a place. It keeps running even after you close the laptop.",
    },
  ];

  const inbox: InboxMessage[] = [];

  if (lastRun?.audit) {
    const over = lastRun.audit.overBudgetKg;
    inbox.push({
      id: `run-${lastRun.id}`,
      from: "audit",
      channel: "fleet.audit",
      tone: over > 0 ? "wa" : "ok",
      title:
        over > 0
          ? `${lastRun.ingest.location} is ${over} kg over the monthly budget`
          : `${lastRun.ingest.location} is within the ${lastRun.audit.monthlyBudgetKg} kg budget`,
      body:
        lastRun.audit.grounded
          ? `Compute class scored ${lastRun.audit.kgCO2e} kgCO2e from $${lastRun.ingest.spendUsd} spend. Factor is a published heuristic, cited against ${lastRun.audit.evidence.length} live sources.`
          : "Audit refused to score: no live factor evidence.",
      action:
        over > 0
          ? "Settle the offset (already attempted if the token allows) or cut spend in this region."
          : "No purchase. File a watch if you want this place monitored.",
      createdAt: lastRun.createdAt,
    });
  }

  if (lastRun?.settlement?.action === "offset" && lastRun.offsetReceipt) {
    const r = lastRun.offsetReceipt;
    inbox.push({
      id: `settle-${r.id}`,
      from: "settle",
      channel: "fleet.settle",
      tone: r.status === "committed" ? "ok" : "no",
      title:
        r.status === "committed"
          ? `Offset committed · ${(r.amountCents ?? 0) / 100} USD`
          : `Offset refused · ${r.refusalCode}`,
      body: r.refusalReason ?? `Receipt ${r.id.slice(0, 8)} on the ledger. Retry-safe via idempotencyKey.`,
      action:
        r.status === "committed"
          ? "Show this receipt to a buyer agent with climatico:read only."
          : "Raise scope or lower the spike. Do not reframe as a handprint.",
      createdAt: r.createdAt,
    });
  }

  const refused = receipts.filter((r) => r.status === "refused").slice(0, 3);
  for (const r of refused) {
    inbox.push({
      id: `refuse-${r.id}`,
      from: "policy",
      channel: "ledger",
      tone: "no",
      title: `Refused ${r.intent}${r.location ? ` @ ${r.location}` : ""}`,
      body: r.refusalReason ?? r.refusalCode ?? "policy",
      action: "This is saved as proof. To succeed, change the claim itself — not the wording.",
      createdAt: r.createdAt,
    });
  }

  const briefs = receipts.filter((r) => r.intent === "brief" && r.status === "committed");
  if (briefs[0]) {
    const r = briefs[0];
    inbox.push({
      id: `brief-${r.id}`,
      from: "clerk",
      channel: "assess",
      tone: "ok",
      title: `Grounded brief for ${r.location}`,
      body: `${r.evidence.length} live sources. First: ${r.evidence[0]?.title ?? "—"}`,
      action: "Promote this place to a watch, or run fleet against the same location.",
      createdAt: r.createdAt,
    });
  }

  inbox.push({
    id: "story-rae-logistics",
    from: "clerk",
    channel: "story.logistics",
    tone: "wa",
    title: "Logistics is Rae's biggest class — still modeled, not measured",
    body: "Orepath traces other companies' freight, but its own logistics (12 t/yr, ±35%) isn't a live write yet. Today: ground Oakland, watch the port, file the SJC compute that runs the tracer. The freight PO write is next.",
    action: "Use the tools on the Assess tab. Don't claim a green chain without evidence.",
    createdAt: Date.now(),
  });

  inbox.push({
    id: "sponsor-tavily",
    from: "ops",
    channel: "stack",
    tone: tavilyKey ? "ok" : "wa",
    title: tavilyKey ? "Tavily is on the write path" : "Tavily is keyless — claim 26HACK",
    body: tavilyKey
      ? "Briefs and audits use your key. Grounding still refuses empty results."
      : "Keyless search works for the demo. Coupon 26HACK at app.tavily.com adds 8,000 credits (plus 1,000 free).",
    action: tavilyKey
      ? "No action."
      : "app.tavily.com → Overview → Coupon → 26HACK, then TAVILY_API_KEY in .dev.vars.",
    createdAt: Date.now(),
  });

  if (!cotalWebhook) {
    inbox.push({
      id: "sponsor-cotal",
      from: "ops",
      channel: "stack",
      tone: "wa",
      title: "Handoffs are on-ledger; Cotal mesh is not subscribed",
      body: "Cotal has no credits. $300 is best use of the product. David and Sven are on site.",
      action: "Join hack.cotal.ai, cotal up -f cotal.yaml, or set COTAL_WEBHOOK_URL.",
      createdAt: Date.now(),
    });
  }

  inbox.sort((a, b) => b.createdAt - a.createdAt);

  const sponsors: SponsorLink[] = [
    {
      id: "cloudflare",
      name: "Cloudflare",
      role: "Host · Workers, DO, Agents SDK, MCP",
      status: "host",
      insight: "The ledger hibernates. Restart does not wipe receipts.",
      how: "Live at climatico.dalrae-jin-work.workers.dev. Redeploy after desk/deck changes.",
      href: "https://developers.cloudflare.com/agents/",
    },
    {
      id: "tavily",
      name: "Tavily",
      role: "Live web evidence",
      status: tavilyKey ? "live" : "booth",
      insight: "Ungrounded briefs and audits are refused. That is the product.",
      how: "Coupon 26HACK — two days only.",
      href: "https://app.tavily.com",
    },
    {
      id: "cotal",
      name: "Cotal",
      role: "Agent mesh · $300 best use",
      status: cotalWebhook ? "live" : "prize",
      insight: "Handoff channels already match Cotal names.",
      how: "hack.cotal.ai + cotal.yaml. Not a credit.",
      href: "https://hack.cotal.ai",
    },
    {
      id: "tenki",
      name: "Tenki",
      role: "Sandbox / CI · $100 credits",
      status: "booth",
      insight: "Not weather. Disposable VMs for agents that write code.",
      how: "Sign up via tenki.cloud/events/agent-native so $100 auto-applies.",
      href: "https://tenki.cloud/events/agent-native",
    },
    {
      id: "aisa",
      name: "AIsa",
      role: "Machine payments · $100 list",
      status: "booth",
      insight: "Offsets settle on our ledger until credits land.",
      how: "Give an organiser the email. No self-serve page.",
      href: "https://aisa.one",
    },
    {
      id: "runtype",
      name: "Runtype",
      role: "Flows / evals · $500 best use",
      status: "prize",
      insight: "Winning requires deploying on Runtype, not a logo.",
      how: "Ask Nathan or Nate for $50 credits; bounty is a real deploy.",
      href: "https://runtype.com",
    },
    {
      id: "mitosis",
      name: "Mitosis Labs",
      role: "Memory beyond a session",
      status: "booth",
      insight: "DO SQLite is our memory today. Mitosis is shared memory across agents.",
      how: "Alex / Prakshal on site.",
      href: "https://mitosislabs.ai",
    },
    {
      id: "hackerbob",
      name: "Hacker Bob",
      role: "Security scan · Michalis judges",
      status: "booth",
      insight: "Point the scan at /mcp and /v1/credentials. Auth is required.",
      how: "Ask Michalis. One scan per builder.",
      href: "https://hackerbob.ai",
    },
    {
      id: "hud",
      name: "HUD",
      role: "Evals · $3k for winners",
      status: "prize",
      insight: "Axel judges. Not a runtime dependency.",
      how: "Winner credits only.",
      href: "https://hud.ai",
    },
    {
      id: "nebius",
      name: "Nebius AI Studio",
      role: "GPU & High-Throughput LLM · Llama 3.3 70B",
      status: nebiusKey ? "live" : "booth",
      insight: nebiusKey
        ? "Connected · High-throughput Studio API for audit & assessment."
        : "Workers AI is default. Nebius if the model is too small.",
      how: "nebius.builders",
      href: "https://studio.nebius.ai",
    },
  ];

  const next: string[] = [];
  const undone = maturity.find((m) => !m.done);
  if (undone) next.push(`Onboarding: ${undone.name} — ${undone.how}`);
  if (!tavilyKey) next.push("Claim Tavily 26HACK so audits are not keyless.");
  if (!cotalWebhook) next.push("Join Cotal mesh if you want the $300 best-use prize.");
  if (lastRun?.audit && lastRun.audit.overBudgetKg > 0) {
    next.push(`Hotspot ${lastRun.ingest.location}: ${lastRun.audit.overBudgetKg} kg over. Cut spend or keep the offset receipt.`);
  }
  next.unshift(
    "Logistics is Orepath's biggest class, still modeled. File Oakland and SJC compute today — don't invent a freight write.",
  );
  next.push("Submitted — can still be overwritten until Thursday 15:00. Redeploy so workers.dev matches this desk.");

  return {
    dashboard,
    maturity,
    classes,
    impact: IMPACT_ROWS,
    abatement: ABATEMENT,
    abatementPlans: receipts.filter((r) => r.intent === "abate" && r.status === "committed").length,
    inbox,
    sponsors,
    next,
    story: OREPATH,
    receipts,
    handoffs,
    runs,
    tavilyKey,
    cotalWebhook,
    nebiusKey,
    aisaConfigured,
  };
}
