import { Agent, callable, getAgentByName } from "agents";
import { hasScope, mintToken, verifyToken, type CredentialGrant } from "./auth";
import { runActionGraph } from "./graph";
import { announceHandoff } from "./cotal";
import { runFleet as executeFleet } from "./fleet";
import { createSandboxSession, sandboxSessionState } from "./tenki";
import { buildWorkspace, type WorkspaceView } from "./insights";
import type {
  ActionInput,
  Dashboard,
  FleetRun,
  Handoff,
  Principal,
  Receipt,
  SandboxCheck,
  UsageEvent,
} from "./types";

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
  status: "committed" | "flagged";
  flag_code: string | null;
  flag_reason: string | null;
  evidence_json: string;
  subject: string;
  token_id: string;
  idempotency_key: string | null;
  created_at: number;
};

export class Ledger extends Agent<Env, LedgerState> {
  initialState: LedgerState = {
    committed: 0,
    flagged: 0,
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
        flag_code TEXT,
        flag_reason TEXT,
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
    this.sql`
      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        subject TEXT NOT NULL,
        path TEXT NOT NULL,
        signals_json TEXT NOT NULL,
        status TEXT NOT NULL,
        assessments_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `;
    this.sql`
      CREATE TABLE IF NOT EXISTS sandbox_checks (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        command TEXT NOT NULL,
        status TEXT NOT NULL,
        output TEXT,
        subject TEXT NOT NULL,
        receipt_id TEXT,
        created_at INTEGER NOT NULL,
        completed_at INTEGER
      )
    `;
    this.sql`CREATE INDEX IF NOT EXISTS sandbox_checks_session ON sandbox_checks(session_id)`;
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
    const flagged = receipt.status === "flagged" ? this.state.flagged + 1 : this.state.flagged;
    const watches =
      receipt.status === "committed" && receipt.intent === "watch"
        ? this.state.watches + 1
        : this.state.watches;
    this.setState({
      ...this.state,
      committed,
      flagged,
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

  /**
   * Step 1 of the sandbox verification write. The Worker creates a real Tenki sandbox
   * (control-plane only — this genuinely calls api.tenki.cloud) and stores it pending.
   * Running `command` inside the sandbox is a duplex-streaming RPC that cannot execute
   * from a Worker, so a caller with a Node runtime (Hermes, a script) must exec it and
   * report the real output back via completeSandboxCheck.
   */
  async startSandboxCheck(command: string, principal: Principal): Promise<SandboxCheck | { error: string }> {
    if (!hasScope(principal, "climatico:transact")) {
      return { error: "This credential has climatico:read only. Mint climatico:transact to write." };
    }
    const trimmed = command.trim();
    if (!trimmed) return { error: "command is required." };
    const result = await createSandboxSession(this.env, `climatico-verify-${Date.now()}`);
    if ("error" in result) return { error: result.error };
    const check: SandboxCheck = {
      id: crypto.randomUUID(),
      sessionId: result.sessionId,
      command: trimmed,
      status: "pending",
      output: null,
      subject: principal.subject,
      receiptId: null,
      createdAt: Date.now(),
      completedAt: null,
    };
    this.sql`
      INSERT INTO sandbox_checks (id, session_id, command, status, output, subject, receipt_id, created_at, completed_at)
      VALUES (${check.id}, ${check.sessionId}, ${check.command}, ${check.status}, ${check.output}, ${check.subject}, ${check.receiptId}, ${check.createdAt}, ${check.completedAt})
    `;
    return check;
  }

  /**
   * Step 2. Flags unless sessionId matches a check this ledger actually created AND
   * Tenki's control plane confirms that session really exists — a caller cannot invent
   * a sessionId and claim fabricated output.
   */
  async completeSandboxCheck(sessionId: string, output: string, principal: Principal): Promise<SandboxCheck | { error: string }> {
    if (!hasScope(principal, "climatico:transact")) {
      return { error: "This credential has climatico:read only. Mint climatico:transact to write." };
    }
    const rows = [
      ...this.sql<{
        id: string;
        session_id: string;
        command: string;
        status: string;
        subject: string;
        created_at: number;
      }>`SELECT id, session_id, command, status, subject, created_at FROM sandbox_checks WHERE session_id = ${sessionId}`,
    ];
    const row = rows[0];
    if (!row) return { error: "Unknown sandbox session. Call startSandboxCheck first — this desk does not accept invented session ids." };
    if (row.status === "completed") return { error: "This sandbox session was already reported." };
    const state = await sandboxSessionState(this.env, sessionId);
    if (!state) {
      return { error: "Tenki does not recognize this session id. Flagging to store unverifiable output." };
    }
    const completedAt = Date.now();
    this.sql`
      UPDATE sandbox_checks SET status = 'completed', output = ${output}, completed_at = ${completedAt}
      WHERE session_id = ${sessionId}
    `;
    return {
      id: row.id,
      sessionId: row.session_id,
      command: row.command,
      status: "completed",
      output,
      subject: row.subject,
      receiptId: null,
      createdAt: row.created_at,
      completedAt,
    };
  }

  listSandboxChecks(limit = 10): SandboxCheck[] {
    const rows = [
      ...this.sql<{
        id: string;
        session_id: string;
        command: string;
        status: string;
        output: string | null;
        subject: string;
        receipt_id: string | null;
        created_at: number;
        completed_at: number | null;
      }>`SELECT * FROM sandbox_checks ORDER BY created_at DESC LIMIT ${Math.min(limit, 30)}`,
    ];
    return rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      command: row.command,
      status: row.status as SandboxCheck["status"],
      output: row.output,
      subject: row.subject,
      receiptId: row.receipt_id,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    }));
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

  workspace(): WorkspaceView {
    return buildWorkspace({
      dashboard: this.dashboard(),
      receipts: this.listReceipts(30),
      handoffs: this.listHandoffs(40),
      runs: this.listFleetRuns(8),
      tavilyKey: Boolean((this.env as Env & { TAVILY_API_KEY?: string }).TAVILY_API_KEY),
      cotalWebhook: Boolean((this.env as Env & { COTAL_WEBHOOK_URL?: string }).COTAL_WEBHOOK_URL),
      tenkiConfigured: Boolean((this.env as Env & { TENKI_API_KEY?: string }).TENKI_API_KEY?.trim()),
    });
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

  listReceipts(limit = 20, subject?: string): Receipt[] {
    const rows = subject
      ? [...this.sql<ReceiptRow>`
          SELECT * FROM receipts WHERE subject = ${subject}
          ORDER BY created_at DESC LIMIT ${Math.min(limit, 50)}
        `]
      : [...this.sql<ReceiptRow>`
          SELECT * FROM receipts ORDER BY created_at DESC LIMIT ${Math.min(limit, 50)}
        `];
    return rows.map((row) => this.toReceipt(row));
  }

  @callable()
  dashboard(): Dashboard {
    return {
      committed: this.state.committed,
      flagged: this.state.flagged,
      watches: this.state.watches,
      lastReceiptId: this.state.lastReceiptId,
      fleetRuns: this.state.fleetRuns ?? 0,
      lastFleetRunId: this.state.lastFleetRunId ?? null,
    };
  }

  @callable()
  storeConnection(input: { subject: string; path: string; signals: unknown; status: string; assessments?: unknown }): { id: string } {
    const id = crypto.randomUUID();
    const now = Date.now();
    this.sql`
      INSERT INTO connections (id, subject, path, signals_json, status, assessments_json, created_at, updated_at)
      VALUES (${id}, ${input.subject}, ${input.path}, ${JSON.stringify(input.signals)}, ${input.status}, ${input.assessments ? JSON.stringify(input.assessments) : null}, ${now}, ${now})
    `;
    return { id };
  }

  @callable()
  listConnections(subject: string): Array<{ id: string; path: string; status: string; signals: unknown; assessments: unknown | null; createdAt: number; updatedAt: number }> {
    const rows = [...this.sql<{ id: string; path: string; status: string; signals_json: string; assessments_json: string | null; created_at: number; updated_at: number }>`
      SELECT id, path, status, signals_json, assessments_json, created_at, updated_at
      FROM connections WHERE subject = ${subject} ORDER BY created_at DESC LIMIT 10
    `];
    return rows.map((r) => ({
      id: r.id,
      path: r.path,
      status: r.status,
      signals: JSON.parse(r.signals_json),
      assessments: r.assessments_json ? JSON.parse(r.assessments_json) : null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  @callable()
  updateConnectionAssessment(id: string, assessments: unknown): { ok: boolean } {
    const now = Date.now();
    this.sql`
      UPDATE connections SET assessments_json = ${JSON.stringify(assessments)}, updated_at = ${now} WHERE id = ${id}
    `;
    return { ok: true };
  }

  policyDoc() {
    return {
      product: "Climatico",
      writes: ["brief", "watch", "offset", "assess", "abate", "fleet.run"],
      flags: [
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
      sandbox: {
        provider: "Tenki",
        trigger: "POST /v1/sandbox/verify then /v1/sandbox/complete, or MCP start_sandbox_check / complete_sandbox_check",
        note: "Worker calls Tenki's control plane for real (create/get). Executing inside the sandbox is a duplex stream a Worker cannot open, so the caller execs it and reports real output back. A sessionId this ledger never created is flagged.",
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
        id, intent, location, amount_cents, note, status, flag_code, flag_reason,
        evidence_json, subject, token_id, idempotency_key, created_at
      ) VALUES (
        ${receipt.id},
        ${receipt.intent},
        ${receipt.location},
        ${receipt.amountCents},
        ${receipt.note},
        ${receipt.status},
        ${receipt.flagCode},
        ${receipt.flagReason},
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
      flagCode: row.flag_code,
      flagReason: row.flag_reason,
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
  workspace: Ledger["workspace"];
  startSandboxCheck: Ledger["startSandboxCheck"];
  completeSandboxCheck: Ledger["completeSandboxCheck"];
  listSandboxChecks: Ledger["listSandboxChecks"];
  storeConnection: Ledger["storeConnection"];
  updateConnectionAssessment: Ledger["updateConnectionAssessment"];
  listConnections: Ledger["listConnections"];
};

export function getLedger(env: Env): Promise<LedgerApi> {
  return getAgentByName(env.Ledger, "main") as unknown as Promise<LedgerApi>;
}
