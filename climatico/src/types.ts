export const SCOPES = ["climatico:read", "climatico:transact", "climatico:admin"] as const;
export type Scope = (typeof SCOPES)[number];

export const INTENTS = ["brief", "watch", "offset", "assess", "abate", "switch", "refund", "freight"] as const;
export type Intent = (typeof INTENTS)[number];

export const FORBIDDEN_INTENTS = [
  "payout",
  "wire_transfer",
  "delete_account",
  "greenwash",
  "admin_override",
  "exfiltrate",
] as const;

export type ActionStatus = "committed" | "flagged";

export type Principal = {
  tokenId: string;
  subject: string;
  scopes: Scope[];
  maxAmountCents: number;
  expiresAt: number;
};

export type ActionInput = {
  intent: string;
  location?: string;
  amountCents?: number;
  source?: string;
  note?: string;
  idempotencyKey?: string;
  priorReceiptId?: string;
  priorAmountCents?: number;
  newSolution?: string;
  freightMode?: string;
  weightKg?: number;
  distanceKm?: number;
};

export type EvidenceItem = {
  title: string;
  url: string;
  snippet: string;
};

export type Receipt = {
  id: string;
  intent: string;
  location: string | null;
  amountCents: number | null;
  note: string | null;
  status: ActionStatus;
  flagCode: string | null;
  flagReason: string | null;
  evidence: EvidenceItem[];
  subject: string;
  tokenId: string;
  idempotencyKey: string | null;
  createdAt: number;
};

export type PolicyDecision =
  | { allow: true }
  | { allow: false; code: string; reason: string };

export type Dashboard = {
  committed: number;
  flagged: number;
  watches: number;
  lastReceiptId: string | null;
  fleetRuns: number;
  lastFleetRunId: string | null;
};

export type UsageEvent = {
  source?: string;
  location?: string;
  spendUsd?: number;
  monthlyBudgetKg?: number;
  monthToDateKg?: number;
};

export type Handoff = {
  id: string;
  runId: string;
  from: "ingest" | "audit" | "settle" | "ledger";
  to: "ingest" | "audit" | "settle" | "ledger";
  channel: string;
  kind: string;
  body: unknown;
  createdAt: number;
};

export type SandboxCheck = {
  id: string;
  sessionId: string;
  command: string;
  status: "pending" | "completed";
  output: string | null;
  subject: string;
  receiptId: string | null;
  createdAt: number;
  completedAt: number | null;
};

export type FleetRun = {
  id: string;
  status: ActionStatus;
  ingest: {
    ok: boolean;
    source: string;
    location: string;
    spendUsd: number;
    monthlyBudgetKg: number;
    monthToDateKg: number;
    reason: string | null;
  };
  audit: {
    kgCO2e: number;
    factor: string;
    projectedMonthKg: number;
    monthlyBudgetKg: number;
    overBudgetKg: number;
    grounded: boolean;
    evidence: EvidenceItem[];
    anomaly: boolean;
  } | null;
  offsetReceipt: Receipt | null;
  settlement: { action: string; amountCents?: number; reason: string | null } | null;
  handoffs: Handoff[];
  createdAt: number;
};
