import { Agent, callable, getAgentByName } from "agents";
import { mintToken, verifyToken, type CredentialGrant } from "./auth";
import { runActionGraph } from "./graph";
import { announceHandoff } from "./cotal";
import { runFleet as executeFleet } from "./fleet";
import type { ActionInput, Dashboard, FleetRun, Handoff, Principal, Receipt, UsageEvent } from "./types";

type LedgerState = Dashboard & {
  mintWindowStart: number;
  mintedInWindow: number;
};

type ReceiptRow = {
  id: string;
  intent: string;
  location: string | null;
  amount_cents: number | null;
  note: string | null;
  status: "committed" | "refused";
  refusal_code: string | null;
  refusal_reason: string | null;
  evidence_json: string;
  subject: string;
  token_id: string;
  idempotency_key: string | null;
  created_at: number;
};

export class Ledger extends Agent<Env, LedgerState> {
  initialState: LedgerState = {
    committed: 0,
    refused: 0,
    watches: 0,
    lastReceiptId: null,
    fleetRuns: 0,
    lastFleetRunId: null,
    mintWindowStart: 0,
    mintedInWindow: 0,
  };

  async onStart() {
    this.sql`
      CREATE TABLE IF NOT EXISTS credentials (
        id TEXT PRIMARY KEY,
        subject TEXT NOT NULL,
        scopes TEXT NOT NULL,
        max_amount_cents INTEGER NOT NULL,
        issued_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        revoked INTEGER NOT NULL DEFAULT 0,
        token_hash TEXT NOT NULL
      )
    `;
    this.sql`
      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        intent TEXT NOT NULL,
        location TEXT,
        amount_cents INTEGER,
        note TEXT,
        status TEXT NOT NULL,
        refusal_code TEXT,
        refusal_reason TEXT,
        evidence_json TEXT NOT NULL,
        subject TEXT NOT NULL,
        token_id TEXT NOT NULL,
        idempotency_key TEXT,
        created_at INTEGER NOT NULL
      )
    `;
    this.sql`CREATE INDEX IF NOT EXISTS receipts_idempotency ON receipts(idempotency_key)`;
    this.sql`
      CREATE TABLE IF NOT EXISTS watches (
        id TEXT PRIMARY KEY,
        location TEXT NOT NULL,
        subject TEXT NOT NULL,
        receipt_id TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `;
    this.sql`
      CREATE TABLE IF NOT EXISTS handoffs (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        from_role TEXT NOT NULL,
        to_role TEXT NOT NULL,
        channel TEXT NOT NULL,
        kind TEXT NOT NULL,
        body_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `;
    this.sql`
      CREATE TABLE IF NOT EXISTS fleet_runs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        run_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `;
  }

  async mintCredential(grant: CredentialGrant): Promise<{
    token: string;
    principal: Principal;
  }> {
    this.rateLimitMint();
    const minted = await mintToken(this.requireSecret(), grant);
    const now = Math.floor(Date.now() / 1000);
    this.sql`
      INSERT INTO credentials (id, subject, scopes, max_amount_cents, issued_at, expires_at, revoked, token_hash)
      VALUES (
        ${minted.principal.tokenId},
        ${minted.principal.subject},
        ${JSON.stringify(minted.principal.scopes)},
        ${minted.principal.maxAmountCents},
        ${now},
        ${minted.principal.expiresAt},
        ${0},
        ${minted.tokenHash}
      )
    `;
    return { token: minted.token, principal: minted.principal };
  }

  async resolvePrincipal(token: string): Promise<Principal | null> {
    const principal = await verifyToken(this.requireSecret(), token);
    if (!principal) return null;
    const rows = [...this.sql<{ revoked: number; expires_at: number }>`
      SELECT revoked, expires_at FROM credentials WHERE id = ${principal.tokenId}
    `];
    const row = rows[0];
    if (!row || row.revoked === 1) return null;
    if (row.expires_at <= Math.floor(Date.now() / 1000)) return null;
    return principal;
  }

  async runAction(input: ActionInput, principal: Principal): Promise<Receipt> {
    const receipt = await runActionGraph(input, principal, {
      env: this.env,
      now: Date.now(),
      newId: () => crypto.randomUUID(),
      findByIdempotency: (key) => this.receiptByIdempotency(key),
    });
    this.persistReceipt(receipt);
    if (receipt.status === "committed" && receipt.intent === "watch" && receipt.location) {
      this.sql`
        INSERT INTO watches (id, location, subject, receipt_id, created_at)
        VALUES (${crypto.randomUUID()}, ${receipt.location}, ${receipt.subject}, ${receipt.id}, ${receipt.createdAt})
      `;
    }
    const committed = receipt.status === "committed" ? this.state.committed + 1 : this.state.committed;
    const refused = receipt.status === "refused" ? this.state.refused + 1 : this.state.refused;
    const watches =
      receipt.status === "committed" && receipt.intent === "watch"
        ? this.state.watches + 1
        : this.state.watches;
    this.setState({
      ...this.state,
      committed,
      refused,
      watches,
      lastReceiptId: receipt.id,
    });
    return receipt;
  }

  async runFleet(event: UsageEvent, principal: Principal): Promise<FleetRun> {
    const run = await executeFleet(event, principal, {
      env: this.env,
      now: Date.now(),
      newId: () => crypto.randomUUID(),
      recordHandoff: (handoff) => this.persistHandoff(handoff),
      runOffset: (input) =>
        this.runAction(
          {
            intent: "offset",
            location: input.location,
            amountCents: input.amountCents,
            note: input.note,
            idempotencyKey: input.idempotencyKey,
          },
          principal,
        ),
    });
    this.sql`
      INSERT INTO fleet_runs (id, status, run_json, created_at)
      VALUES (${run.id}, ${run.status}, ${JSON.stringify(run)}, ${run.createdAt})
    `;
    this.setState({
      ...this.state,
      fleetRuns: (this.state.fleetRuns ?? 0) + 1,
      lastFleetRunId: run.id,
    });
    return run;
  }

  listHandoffs(limit = 30): Handoff[] {
    const rows = [
      ...this.sql<{
        id: string;
        run_id: string;
        from_role: Handoff["from"];
        to_role: Handoff["to"];
        channel: string;
        kind: string;
        body_json: string;
        created_at: number;
      }>`SELECT * FROM handoffs ORDER BY created_at DESC LIMIT ${Math.min(limit, 80)}`,
    ];
    return rows.map((row) => ({
      id: row.id,
      runId: row.run_id,
      from: row.from_role,
      to: row.to_role,
      channel: row.channel,
      kind: row.kind,
      body: JSON.parse(row.body_json) as unknown,
      createdAt: row.created_at,
    }));
  }

  listFleetRuns(limit = 10): FleetRun[] {
    const rows = [
      ...this.sql<{ run_json: string }>`
        SELECT run_json FROM fleet_runs ORDER BY created_at DESC LIMIT ${Math.min(limit, 20)}
      `,
    ];
    return rows.map((row) => JSON.parse(row.run_json) as FleetRun);
  }

  private persistHandoff(handoff: Handoff) {
    this.sql`
      INSERT INTO handoffs (id, run_id, from_role, to_role, channel, kind, body_json, created_at)
      VALUES (
        ${handoff.id},
        ${handoff.runId},
        ${handoff.from},
        ${handoff.to},
        ${handoff.channel},
        ${handoff.kind},
        ${JSON.stringify(handoff.body)},
        ${handoff.createdAt}
      )
    `;
    this.ctx.waitUntil(announceHandoff(this.env, handoff));
  }

  getReceipt(id: string): Receipt | null {
    const rows = [...this.sql<ReceiptRow>`SELECT * FROM receipts WHERE id = ${id}`];
    return rows[0] ? this.toReceipt(rows[0]) : null;
  }

  listReceipts(limit = 20): Receipt[] {
    const rows = [...this.sql<ReceiptRow>`
      SELECT * FROM receipts ORDER BY created_at DESC LIMIT ${Math.min(limit, 50)}
    `];
    return rows.map((row) => this.toReceipt(row));
  }

  @callable()
  dashboard(): Dashboard {
    return {
      committed: this.state.committed,
      refused: this.state.refused,
      watches: this.state.watches,
      lastReceiptId: this.state.lastReceiptId,
      fleetRuns: this.state.fleetRuns ?? 0,
      lastFleetRunId: this.state.lastFleetRunId ?? null,
    };
  }

  policyDoc() {
    return {
      product: "Climatico",
      writes: ["brief", "watch", "offset", "assess", "fleet.run"],
      refuses: [
        "payout",
        "wire_transfer",
        "delete_account",
        "greenwash",
        "admin_override",
        "exfiltrate",
        "unknown intents",
        "writes without a location",
        "briefs that cannot be grounded in live web evidence",
        "offsets over the token's maxAmountCents",
      ],
      scopes: {
        "climatico:read": "discover, policy, receipts",
        "climatico:transact": "commit a climate action",
        "climatico:admin": "higher offset ceiling",
      },
      fleet: {
        roles: ["ingest", "audit", "settle"],
        channels: ["fleet.ingest", "fleet.audit", "fleet.settle"],
        trigger: "POST /v1/fleet/run or MCP run_fleet",
        coordination: "Durable handoff log. Optional Cotal mesh via cotal.yaml / hack.cotal.ai.",
      },
      persistence: "Durable Object SQLite. A watch or fleet run opened today is still here after the laptop sleeps.",
    };
  }

  private receiptByIdempotency(key: string): Receipt | null {
    const rows = [...this.sql<ReceiptRow>`SELECT * FROM receipts WHERE idempotency_key = ${key}`];
    return rows[0] ? this.toReceipt(rows[0]) : null;
  }

  private persistReceipt(receipt: Receipt) {
    this.sql`
      INSERT INTO receipts (
        id, intent, location, amount_cents, note, status, refusal_code, refusal_reason,
        evidence_json, subject, token_id, idempotency_key, created_at
      ) VALUES (
        ${receipt.id},
        ${receipt.intent},
        ${receipt.location},
        ${receipt.amountCents},
        ${receipt.note},
        ${receipt.status},
        ${receipt.refusalCode},
        ${receipt.refusalReason},
        ${JSON.stringify(receipt.evidence)},
        ${receipt.subject},
        ${receipt.tokenId},
        ${receipt.idempotencyKey},
        ${receipt.createdAt}
      )
    `;
  }

  private toReceipt(row: ReceiptRow): Receipt {
    return {
      id: row.id,
      intent: row.intent,
      location: row.location,
      amountCents: row.amount_cents,
      note: row.note,
      status: row.status,
      refusalCode: row.refusal_code,
      refusalReason: row.refusal_reason,
      evidence: JSON.parse(row.evidence_json) as Receipt["evidence"],
      subject: row.subject,
      tokenId: row.token_id,
      idempotencyKey: row.idempotency_key,
      createdAt: row.created_at,
    };
  }

  private rateLimitMint() {
    const now = Date.now();
    const windowMs = 60_000;
    if (now - this.state.mintWindowStart > windowMs) {
      this.setState({ ...this.state, mintWindowStart: now, mintedInWindow: 1 });
      return;
    }
    if (this.state.mintedInWindow >= 30) {
      throw new Error("credential_rate_limited");
    }
    this.setState({ ...this.state, mintedInWindow: this.state.mintedInWindow + 1 });
  }

  private requireSecret(): string {
    const secret = this.env.TOKEN_SECRET;
    if (!secret) throw new Error("TOKEN_SECRET is not configured");
    return secret;
  }
}

export type LedgerApi = {
  mintCredential: Ledger["mintCredential"];
  resolvePrincipal: Ledger["resolvePrincipal"];
  runAction: Ledger["runAction"];
  getReceipt: Ledger["getReceipt"];
  listReceipts: Ledger["listReceipts"];
  dashboard: Ledger["dashboard"];
  policyDoc: Ledger["policyDoc"];
  runFleet: Ledger["runFleet"];
  listHandoffs: Ledger["listHandoffs"];
  listFleetRuns: Ledger["listFleetRuns"];
};

export function getLedger(env: Env): Promise<LedgerApi> {
  return getAgentByName(env.Ledger, "main") as unknown as Promise<LedgerApi>;
}
