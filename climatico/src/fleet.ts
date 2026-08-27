import { gatherEvidence } from "./tavily";
import type { EvidenceItem, FleetRun, Handoff, Principal, Receipt, UsageEvent } from "./types";

/** Demo intensity: kgCO2e per USD of cloud/SaaS spend. Grounded by Tavily, not invented as GHG Protocol. */
const KG_PER_USD = 0.45;
/** Cents of offset per kg over monthly budget. */
const CENTS_PER_KG = 20;

export type FleetSink = {
  env: Env;
  now: number;
  newId: () => string;
  recordHandoff: (handoff: Handoff) => void;
  runOffset: (input: {
    location: string;
    amountCents: number;
    note: string;
    idempotencyKey: string;
  }) => Promise<Receipt>;
};

export async function runFleet(
  event: UsageEvent,
  principal: Principal,
  sink: FleetSink,
): Promise<FleetRun> {
  const runId = sink.newId();
  const handoffs: Handoff[] = [];
  const push = (
    from: Handoff["from"],
    to: Handoff["to"],
    channel: string,
    kind: string,
    body: unknown,
  ) => {
    const handoff: Handoff = {
      id: sink.newId(),
      runId,
      from,
      to,
      channel,
      kind,
      body,
      createdAt: sink.now,
    };
    handoffs.push(handoff);
    sink.recordHandoff(handoff);
  };

  const ingest = ingestUsage(event);
  push("ingest", "audit", "fleet.ingest", "usage_parsed", ingest);

  if (!ingest.ok) {
    return {
      id: runId,
      status: "flagged",
      ingest,
      audit: null,
      offsetReceipt: null,
      settlement: null,
      handoffs,
      createdAt: sink.now,
    };
  }

  const evidence = await gatherEvidence(
    sink.env,
    ingest.location,
    "assess",
  );
  const kg = round1(ingest.spendUsd * KG_PER_USD);
  const projectedKg = round1(ingest.monthToDateKg + kg);
  const overKg = round1(Math.max(0, projectedKg - ingest.monthlyBudgetKg));
  const audit = {
    kgCO2e: kg,
    factor: `heuristic ${KG_PER_USD} kg per USD spend, cited against live web evidence`,
    projectedMonthKg: projectedKg,
    monthlyBudgetKg: ingest.monthlyBudgetKg,
    overBudgetKg: overKg,
    grounded: evidence.grounded,
    evidence: evidence.evidence,
    anomaly: ingest.spendUsd >= 1000,
  };
  push("audit", "settle", "fleet.audit", "emissions_scored", audit);

  if (!evidence.grounded) {
    push("audit", "ledger", "fleet.audit", "flagged", {
      code: "ungrounded",
      reason: "Audit will not score emissions without live factor evidence.",
    });
    return {
      id: runId,
      status: "flagged",
      ingest,
      audit,
      offsetReceipt: null,
      settlement: { action: "flagged", reason: "ungrounded_factors" },
      handoffs,
      createdAt: sink.now,
    };
  }

  if (overKg <= 0) {
    push("settle", "ledger", "fleet.settle", "within_budget", {
      projectedKg,
      budgetKg: ingest.monthlyBudgetKg,
    });
    return {
      id: runId,
      status: "committed",
      ingest,
      audit,
      offsetReceipt: null,
      settlement: { action: "none", reason: "within_monthly_budget" },
      handoffs,
      createdAt: sink.now,
    };
  }

  const amountCents = Math.min(
    Math.max(Math.ceil(overKg * CENTS_PER_KG), 1),
    principal.maxAmountCents,
  );
  const receipt = await sink.runOffset({
    location: ingest.location,
    amountCents,
    note: `fleet ${runId}: ${ingest.source} spike ${ingest.spendUsd} USD → ${overKg} kg over budget`,
    idempotencyKey: `fleet:${runId}:offset`,
  });
  push("settle", "ledger", "fleet.settle", "offset_attempt", {
    amountCents,
    receiptId: receipt.id,
    status: receipt.status,
    flagCode: receipt.flagCode,
  });

  return {
    id: runId,
    status: receipt.status === "committed" ? "committed" : "flagged",
    ingest,
    audit,
    offsetReceipt: receipt,
    settlement: {
      action: "offset",
      amountCents,
      reason: receipt.status === "committed" ? "over_budget" : receipt.flagCode,
    },
    handoffs,
    createdAt: sink.now,
  };
}

function ingestUsage(event: UsageEvent) {
  const location = (event.location ?? "").trim();
  const spendUsd = Number(event.spendUsd);
  const source = (event.source ?? "cloud").trim() || "cloud";
  const monthlyBudgetKg = Number(event.monthlyBudgetKg ?? 50);
  const monthToDateKg = Number(event.monthToDateKg ?? 40);

  if (!location) {
    return {
      ok: false as const,
      source,
      location: "",
      spendUsd: spendUsd || 0,
      monthlyBudgetKg,
      monthToDateKg,
      reason: "Ingest flagged: every fleet run needs a location (region or site).",
    };
  }
  if (!Number.isFinite(spendUsd) || spendUsd <= 0) {
    return {
      ok: false as const,
      source,
      location,
      spendUsd: 0,
      monthlyBudgetKg,
      monthToDateKg,
      reason: "Ingest flagged: spendUsd must be > 0. This is a usage spike, not a slogan.",
    };
  }

  return {
    ok: true as const,
    source,
    location,
    spendUsd,
    monthlyBudgetKg,
    monthToDateKg,
    reason: null as string | null,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export type { EvidenceItem };
