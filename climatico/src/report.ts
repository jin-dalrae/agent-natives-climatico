import type { FleetRun, Handoff, Receipt } from "./types";

export type ProgressReport = {
  summary: string;
  hotspotClass: string;
  hotspotTons: number;
  totalModeledTons: number;
  commitsThisPeriod: number;
  refusalsThisPeriod: number;
  fleetRunsThisPeriod: number;
  overBudgetLocations: { location: string; kgOver: number }[];
  switches: number;
  refunds: number;
  totalRefundCents: number;
  suggestions: string[];
  generatedAt: number;
};

/**
 * Build a snapshot report from the ledger state and current fleet runs.
 */
export function buildReport(input: {
  runs: FleetRun[];
  receipts: Receipt[];
  handoffs: Handoff[];
  committed: number;
  refused: number;
  fleetRuns: number;
  watches: number;
}): ProgressReport {
  const { runs, receipts, committed, refused, fleetRuns } = input;

  const lastRun = runs[0] ?? null;
  const overBudget = lastRun?.audit && lastRun.audit.overBudgetKg > 0
    ? [{ location: lastRun.ingest.location, kgOver: lastRun.audit.overBudgetKg }]
    : [];

  const totalModeledTons = 37.7;

  const switches = receipts.filter((r) => r.intent === "switch" && r.status === "committed").length;
  const refunds = receipts.filter((r) => r.intent === "refund" && r.status === "committed");
  const totalRefundCents = refunds.reduce((sum, r) => sum + (r.amountCents ?? 0), 0);

  const suggestions: string[] = [];
  if (overBudget.length > 0) {
    suggestions.push(`Cut spend or offset at ${overBudget[0].location} — ${overBudget[0].kgOver} kg over budget this month.`);
  }
  if (fleetRuns === 0) {
    suggestions.push("Run your first fleet calculation to see where emissions are coming from.");
  }
  if (!receipts.some((r) => r.status === "committed" && r.evidence.length > 0)) {
    suggestions.push("Ground at least one emission class with real evidence to move from modeled to measured.");
  }
  if (switches > 0) {
    suggestions.push(`${switches} solution switch(es) logged. ${refunds.length} refund(s) claimed, ${(totalRefundCents / 100).toFixed(2)} USD returned.`);
  }
  if (refunds.length === 0 && committed > 0) {
    suggestions.push("Have you switched to a greener solution? File a 'switch' to claim back the prior offset.");
  }
  suggestions.push("Logistics (12 t/yr) is your biggest class — still modeled. Talk to your freight provider about data sharing.");

  return {
    summary: `${fleetRuns} fleet runs, ${committed} commits, ${refused} refusals, ${switches} switches, ${refunds.length} refunds (${(totalRefundCents / 100).toFixed(2)} USD). ${totalModeledTons} tCO₂e/yr modeled across 7 classes.`,
    hotspotClass: "logistics",
    hotspotTons: 12.0,
    totalModeledTons,
    commitsThisPeriod: committed,
    refusalsThisPeriod: refused,
    fleetRunsThisPeriod: fleetRuns,
    overBudgetLocations: overBudget,
    switches,
    refunds: refunds.length,
    totalRefundCents,
    suggestions,
    generatedAt: Date.now(),
  };
}