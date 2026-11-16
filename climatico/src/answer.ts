import type { EvidenceItem, FleetRun, Receipt } from "./types";

export type AnswerLineStatus = "grounded" | "modeled";

export type AnswerLine = {
  id: string;
  label: string;
  detail: string;
  status: AnswerLineStatus;
  method: string;
  sources: EvidenceItem[];
  sourceCount: number;
  receiptIds: string[];
  at: number;
};

export type BuyerAnswer = {
  company: string;
  buyer: string;
  period: string;
  lines: AnswerLine[];
  coverage: { grounded: string[]; modeled: string[] };
  gaps: string[];
  excludedTraceRecords: number;
  generatedAt: number;
};

const CANONICAL_CLASSES = [
  "Cloud & AI compute",
  "Hardware & electronics",
  "Travel & commuting",
  "Vendors & SaaS",
  "Logistics",
  "Purchased electricity",
  "Direct emissions",
] as const;

const ASSESS_CLASS_NAMES: Record<string, string> = {
  hardware: "Hardware & electronics",
  travel: "Travel & commuting",
  saas: "Vendors & SaaS",
  logistics: "Logistics",
  electricity: "Purchased electricity",
  direct: "Direct emissions",
};

const MAX_SOURCES_PER_LINE = 3;
const MAX_LINES = 20;

function clean(value: string, fallback: string): string {
  const trimmed = value.trim().slice(0, 120);
  return trimmed || fallback;
}

function freightGrounded(r: Receipt): boolean {
  return r.evidence.some((e) => e.url === "ledger://freight/scored");
}

function assessClassId(r: Receipt): string | null {
  const match = /^class-assess:([a-z]+)/.exec(r.note ?? "");
  return match ? match[1] : null;
}

/**
 * Compile a buyer-facing answer from committed ledger records only.
 * Never sums lines into a company total: each line carries its own method
 * and status, and anything without records is reported as a gap.
 * Trace records are customer shipments, not the company's own footprint,
 * so they are counted as excluded rather than answered.
 */
export function buildAnswer(input: {
  runs: FleetRun[];
  receipts: Receipt[];
  buyer: string;
  period: string;
  company: string;
}): BuyerAnswer {
  const buyer = clean(input.buyer, "EV cell buyer");
  const period = clean(input.period, "2026");
  const company = clean(input.company, "Orepath");

  const lines: AnswerLine[] = [];
  const groundedClasses = new Set<string>();

  for (const run of input.runs) {
    if (run.status !== "committed" || !run.audit) continue;
    const grounded = run.audit.grounded;
    if (grounded) groundedClasses.add("Cloud & AI compute");
    lines.push({
      id: `run-${run.id}`,
      label: `Cloud compute · ${run.ingest.location} · $${run.ingest.spendUsd}`,
      detail: `${run.audit.kgCO2e} kg CO2e (${run.audit.factor})`,
      status: grounded ? "grounded" : "modeled",
      method: run.audit.factor,
      sources: run.audit.evidence.slice(0, MAX_SOURCES_PER_LINE),
      sourceCount: run.audit.evidence.length,
      receiptIds: run.offsetReceipt ? [run.offsetReceipt.id] : [],
      at: run.createdAt,
    });
  }

  let excludedTraceRecords = 0;
  for (const r of input.receipts) {
    if (r.status !== "committed") continue;
    if (r.intent === "trace") {
      excludedTraceRecords += 1;
      continue;
    }
    if (r.intent === "freight") {
      const grounded = freightGrounded(r);
      if (grounded) groundedClasses.add("Logistics");
      lines.push({
        id: `freight-${r.id}`,
        label: `Freight · ${r.location ?? "unspecified lane"}`,
        detail: r.note ?? "freight leg recorded",
        status: grounded ? "grounded" : "modeled",
        method: "heuristic kg CO2e per tonne-km by mode",
        sources: r.evidence.slice(0, MAX_SOURCES_PER_LINE),
        sourceCount: r.evidence.length,
        receiptIds: [r.id],
        at: r.createdAt,
      });
      continue;
    }
    if (r.intent === "assess" && r.evidence.length > 0) {
      const classId = assessClassId(r);
      const className = classId ? (ASSESS_CLASS_NAMES[classId] ?? classId) : null;
      if (className) groundedClasses.add(className);
      lines.push({
        id: `assess-${r.id}`,
        label: className ? `${className} · assessed` : `Assessment · ${r.location ?? "unspecified"}`,
        detail: r.note ?? "class grounded with live sources",
        status: "grounded",
        method: "live web sources",
        sources: r.evidence.slice(0, MAX_SOURCES_PER_LINE),
        sourceCount: r.evidence.length,
        receiptIds: [r.id],
        at: r.createdAt,
      });
    }
  }

  lines.sort((a, b) => b.at - a.at);
  const capped = lines.slice(0, MAX_LINES);

  const modeled = CANONICAL_CLASSES.filter((c) => !groundedClasses.has(c));
  const gaps = modeled.map((c) => `${c}: no connected records yet — still modeled.`);
  if (input.runs.length === 0 && input.receipts.filter((r) => r.status === "committed").length === 0) {
    gaps.unshift("Ledger is empty: file a cloud calculation or freight leg to start the answer.");
  }

  return {
    company,
    buyer,
    period,
    lines: capped,
    coverage: { grounded: [...groundedClasses], modeled },
    gaps,
    excludedTraceRecords,
    generatedAt: Date.now(),
  };
}
