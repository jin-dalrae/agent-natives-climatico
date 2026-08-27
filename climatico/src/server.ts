import { routeAgentRequest } from "agents";
import { handleA2A } from "./a2a";
import { bearerFrom, type CredentialGrant } from "./auth";
import {
  agentCard,
  aiAgentJson,
  aiCatalog,
  mcpServerCard,
  protectedResourceMetadata,
  robotsTxt,
} from "./card";
import { json, publicBase, readJson, unauthorized } from "./http";
import { Clerk } from "./clerk";
import { landingPage } from "./landing";
import { getLedger, Ledger } from "./ledger";
import { mcpHandler } from "./mcp";
import { researchAlternatives, summarizeAbatement } from "./abatement";
import { buildReport } from "./report";
import { getOrepathAgent, OrepathAgent } from "./orepath-agent";
import { getProviderAgent, ProviderAgent } from "./provider";
import { cortexRemember, cortexRecall } from "./cortex";
import { runAutoAssessment, type FolderScan } from "./ingest";

export { Clerk, Ledger, OrepathAgent, ProviderAgent };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      return await handle(request, env, ctx);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      if (message === "credential_rate_limited") {
        return json(request, { error: "rate_limited", message: "Too many credential mints." }, 429);
      }
      console.error(
        JSON.stringify({
          message: "unhandled error",
          error: message,
          path: new URL(request.url).pathname,
        }),
      );
      return json(request, { error: "internal_error" }, 500);
    }
  },

  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
    const ledger = await getLedger(env);

    const minted = await ledger.mintCredential({
      subject: "scheduler",
      scopes: ["climatico:read", "climatico:transact"],
    });

    // 1. Fleet run: simulate Orepath's cloud spend
    const locations = ["SJC", "PDX", "IAD"];
    const loc = locations[Math.floor(Math.random() * locations.length)];
    const spendRands = [120, 320, 420, 580];
    const spend = spendRands[Math.floor(Math.random() * spendRands.length)];

    const run = await ledger.runFleet({
      source: "cloud",
      location: loc,
      spendUsd: spend,
      monthlyBudgetKg: 50,
      monthToDateKg: Math.round(30 + Math.random() * 40),
    }, minted.principal);
    console.log(JSON.stringify({ message: "scheduled fleet run", id: run.id, location: loc, spend, status: run.status }));

    // 2. Research abatement alternatives
    ctx.waitUntil((async () => {
      const research = await researchAlternatives(env, "logistics", "Oakland port");
      if (research.grounded) {
        const summary = await summarizeAbatement(env, "logistics", 12.0, research.suggestions);
        await ledger.runAction({
          intent: "abate",
          location: "Oakland port",
          source: "logistics",
          note: summary || "researched alternatives",
        }, minted.principal);
      }
    })());

    // 3. Cortex memory (store fleet run summary)
    ctx.waitUntil(cortexRemember(env, "fleet-runs",
      `Fleet run ${run.id.slice(0,8)}: $${spend} at ${loc}, ${run.audit?.kgCO2e || '?'}kg, status ${run.status}`
    ).catch(() => null));

    // 5. Provider fulfillment if offset was committed
    if (run.offsetReceipt) {
      ctx.waitUntil((async () => {
        const provider = await getProviderAgent(env, "green-offset-co");
        const handoff = run.handoffs?.[run.handoffs.length - 1];
        if (handoff) {
          const result = await provider.fulfillOffset(handoff);
          await cortexRemember(env, "provider", `Offset ${result.fulfillmentId} at ${result.priceCents}¢ via ${result.note}`);
          console.log(JSON.stringify({ message: "provider fulfilled offset", fulfillmentId: result.fulfillmentId }));
        }
      })());
    }
  },
} satisfies ExportedHandler<Env>;

async function handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const origin = publicBase(request, env);
  const path = url.pathname.replace(/\/$/, "") || "/";

  if (path === "/" && request.method === "GET") {
    return new Response(landingPage(), {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
    });
  }

  if (request.method === "OPTIONS" && path.startsWith("/v1")) {
    return json(request, { ok: true });
  }

  if (
    path === "/.well-known/agent-card.json" ||
    path === "/.well-known/agent.json" ||
    path === "/.well-known/agent-card"
  ) {
    return json(request, agentCard(origin));
  }

  if (path === "/ai-agent.json" || path === "/.well-known/ai-agent.json") {
    return json(request, aiAgentJson(origin));
  }

  if (path === "/.well-known/mcp.json" || path === "/.well-known/mcp/server-card.json") {
    return json(request, mcpServerCard(origin));
  }

  if (path === "/.well-known/ai-catalog.json") {
    return json(request, aiCatalog(origin));
  }

  if (path === "/robots.txt") {
    return new Response(robotsTxt(origin), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (path === "/.well-known/oauth-protected-resource") {
    return json(request, protectedResourceMetadata(origin));
  }

  if (path === "/health") {
    return json(request, { ok: true, product: "climatico" });
  }

  if (path === "/v1/policy") {
    const ledger = await getLedger(env);
    return json(request, await ledger.policyDoc());
  }

  if (path === "/v1/credentials" && request.method === "POST") {
    const body = (await readJson<CredentialGrant>(request)) ?? {};
    const ledger = await getLedger(env);
    const minted = await ledger.mintCredential(body);
    console.log(
      JSON.stringify({
        message: "credential minted",
        tokenId: minted.principal.tokenId,
        scopes: minted.principal.scopes,
        subject: minted.principal.subject,
      }),
    );
    return json(request, {
      token: minted.token,
      token_type: "bearer",
      expires_at: minted.principal.expiresAt,
      scopes: minted.principal.scopes,
      maxAmountCents: minted.principal.maxAmountCents,
      subject: minted.principal.subject,
      how: "Send Authorization: Bearer <token> to /mcp, /a2a, and /v1/actions.",
    });
  }

  if (path === "/v1/dashboard") {
    const ledger = await getLedger(env);
    return json(request, await ledger.dashboard());
  }

  if (path === "/v1/workspace") {
    const ledger = await getLedger(env);
    return json(request, await ledger.workspace());
  }

  if (path === "/v1/receipts" && request.method === "GET") {
    const principal = await principalOr401(request, env);
    if (principal instanceof Response) return principal;
    const ledger = await getLedger(env);
    const subject = url.searchParams.get("subject") ?? undefined;
    return json(request, { receipts: await ledger.listReceipts(20, subject) });
  }

  if (path.startsWith("/v1/receipts/") && request.method === "GET") {
    const principal = await principalOr401(request, env);
    if (principal instanceof Response) return principal;
    const id = path.slice("/v1/receipts/".length);
    const ledger = await getLedger(env);
    const receipt = await ledger.getReceipt(id);
    if (!receipt) return json(request, { error: "not_found" }, 404);
    return json(request, receipt);
  }

  if (path === "/v1/actions" && request.method === "POST") {
    const principal = await principalOr401(request, env);
    if (principal instanceof Response) return principal;
    const body = (await readJson<{
      intent?: string;
      location?: string;
      amountCents?: number;
      source?: string;
      note?: string;
      idempotencyKey?: string;
      newSolution?: string;
      priorReceiptId?: string;
      priorAmountCents?: number;
      freightMode?: string;
      weightKg?: number;
      distanceKm?: number;
    }>(request)) ?? {};
    const ledger = await getLedger(env);
    const receipt = await ledger.runAction(
      {
        intent: body.intent ?? "",
        location: body.location,
        amountCents: body.amountCents,
        source: body.source,
        note: body.note,
        idempotencyKey: body.idempotencyKey,
        newSolution: body.newSolution,
        priorReceiptId: body.priorReceiptId,
        priorAmountCents: body.priorAmountCents,
        freightMode: body.freightMode,
        weightKg: body.weightKg,
        distanceKm: body.distanceKm,
      },
      principal,
    );
    return json(request, { receipt }, receipt.status === "refused" ? 422 : 201);
  }

  if (path === "/v1/fleet/run" && request.method === "POST") {
    const principal = await principalOr401(request, env);
    if (principal instanceof Response) return principal;
    const body = (await readJson<{
      source?: string;
      location?: string;
      spendUsd?: number;
      monthlyBudgetKg?: number;
      monthToDateKg?: number;
    }>(request)) ?? {};
    const ledger = await getLedger(env);
    const run = await ledger.runFleet(body, principal);
    return json(request, { run }, run.status === "refused" ? 422 : 201);
  }

  if (path === "/v1/fleet/runs" && request.method === "GET") {
    const principal = await principalOr401(request, env);
    if (principal instanceof Response) return principal;
    const ledger = await getLedger(env);
    return json(request, { runs: await ledger.listFleetRuns(10) });
  }

  if (path === "/v1/handoffs" && request.method === "GET") {
    const principal = await principalOr401(request, env);
    if (principal instanceof Response) return principal;
    const ledger = await getLedger(env);
    return json(request, { handoffs: await ledger.listHandoffs(40) });
  }

  if (path === "/v1/sandbox/verify" && request.method === "POST") {
    const principal = await principalOr401(request, env);
    if (principal instanceof Response) return principal;
    const body = (await readJson<{ command?: string }>(request)) ?? {};
    const ledger = await getLedger(env);
    const check = await ledger.startSandboxCheck(body.command ?? "", principal);
    return json(request, { check }, "error" in check ? 422 : 201);
  }

  if (path === "/v1/sandbox/complete" && request.method === "POST") {
    const principal = await principalOr401(request, env);
    if (principal instanceof Response) return principal;
    const body = (await readJson<{ sessionId?: string; output?: string }>(request)) ?? {};
    const ledger = await getLedger(env);
    const check = await ledger.completeSandboxCheck(body.sessionId ?? "", body.output ?? "", principal);
    return json(request, { check }, "error" in check ? 422 : 200);
  }

  if (path === "/v1/sandbox/checks" && request.method === "GET") {
    const principal = await principalOr401(request, env);
    if (principal instanceof Response) return principal;
    const ledger = await getLedger(env);
    return json(request, { checks: await ledger.listSandboxChecks(10) });
  }

  if (path === "/v1/report" && request.method === "GET") {
    const ledger = await getLedger(env);
    const runs = await ledger.listFleetRuns(10);
    const receipts = await ledger.listReceipts(20);
    const handoffs = await ledger.listHandoffs(30);
    const d = await ledger.dashboard();
    const report = buildReport({
      runs,
      receipts,
      handoffs,
      committed: d.committed,
      refused: d.refused,
      fleetRuns: d.fleetRuns ?? 0,
      watches: d.watches,
    });

    // Enrich with Cortex memory
    ctx.waitUntil(enrichReport(env));

    return json(request, report);
  }

  // --- Orepath employee agent endpoints ---
  if (path === "/v1/agents/orepath" && request.method === "GET") {
    const agent = await getOrepathAgent(env);
    return json(request, await agent.getStatus());
  }
  if (path === "/v1/agents/orepath/start" && request.method === "POST") {
    const agent = await getOrepathAgent(env);
    return json(request, await agent.start());
  }
  if (path === "/v1/agents/orepath/stop" && request.method === "POST") {
    const agent = await getOrepathAgent(env);
    return json(request, await agent.stop());
  }

  if (path === "/v1/observe" && request.method === "GET") {
    const ore = await getOrepathAgent(env);
    const oreStatus = await ore.getStatus();
    const ledger = await getLedger(env);
    const runs = await ledger.listFleetRuns(5);
    const receipts = await ledger.listReceipts(10);
    const provider = await getProviderAgent(env, "green-offset-co");
    const providerStatus = await provider.getStatus();
    const workspace = await ledger.workspace();
    const d = await ledger.dashboard();
    const memory = await cortexRecall(env, "fleet-runs", 3);
    return json(request, {
      orepath: oreStatus,
      provider: providerStatus,
      recentRuns: runs.map((r) => ({
        id: r.id,
        location: r.ingest.location,
        spend: r.ingest.spendUsd,
        kgCO2e: r.audit?.kgCO2e ?? null,
        overBudgetKg: r.audit?.overBudgetKg ?? null,
        status: r.status,
        offsetCents: r.offsetReceipt?.amountCents ?? null,
        at: r.createdAt,
      })),
      recentReceipts: receipts.map((r) => ({
        id: r.id,
        intent: r.intent,
        location: r.location,
        amountCents: r.amountCents,
        status: r.status,
        at: r.createdAt,
        note: r.note?.slice(0, 80),
      })),
      inboxAlerts: workspace.inbox.filter((m) => m.tone === "no" || m.tone === "wa").slice(0, 5),
      summary: {
        committed: d.committed,
        refused: d.refused,
        fleetRuns: d.fleetRuns ?? 0,
        watches: d.watches,
      },
      memory: memory.map((m) => ({ content: m.content.slice(0, 120), at: m.timestamp })),
      refreshedAt: Date.now(),
    });
  }

  // --- Provider agent endpoints ---
  if (path === "/v1/agents/provider" && request.method === "GET") {
    const agent = await getProviderAgent(env, "green-offset-co");
    return json(request, await agent.discover());
  }
  if (path === "/v1/agents/provider/status" && request.method === "GET") {
    const agent = await getProviderAgent(env, "green-offset-co");
    return json(request, await agent.getStatus());
  }

  // --- Cortex memory endpoints ---
  if (path === "/v1/memory" && request.method === "POST") {
    const principal = await principalOr401(request, env);
    if (principal instanceof Response) return principal;
    const body = (await readJson<{ namespace: string; content: string }>(request)) ?? { namespace: "", content: "" };
    const id = await cortexRemember(env, body.namespace || "general", body.content, { subject: principal.subject });
    return json(request, { ok: !!id, memoryId: id || null }, id ? 201 : 422);
  }
  if (path === "/v1/memory" && request.method === "GET") {
    const principal = await principalOr401(request, env);
    if (principal instanceof Response) return principal;
    const ns = url.searchParams.get("namespace") || "general";
    const memories = await cortexRecall(env, ns, 10);
    return json(request, { memories });
  }

  if (path === "/v1/connect" && request.method === "POST") {
    const principal = await principalOr401(request, env);
    if (principal instanceof Response) return principal;
    const body = (await readJson<{ path: string; signals: Array<{ kind: string; class: string; evidence: string; confidence: number; spendUsd?: number }> }>(request)) ?? { path: "", signals: [] };
    if (!body.path || !body.signals) {
      return json(request, { error: "missing_path_or_signals" }, 422);
    }
    const scan: FolderScan = {
      path: body.path,
      signals: body.signals as never,
      fileCount: 0,
      scannedAt: Date.now(),
    };
    const ledger = await getLedger(env);
    const { id } = await ledger.storeConnection({
      subject: principal.subject,
      path: body.path,
      signals: scan.signals,
      status: "scanned",
    });
    const assessments = await runAutoAssessment(env, scan, principal.subject);
    await ledger.updateConnectionAssessment(id, assessments);
    return json(request, { id, path: body.path, signals: scan.signals.length, assessments }, 201);
  }

  if (path === "/v1/connections" && request.method === "GET") {
    const principal = await principalOr401(request, env);
    if (principal instanceof Response) return principal;
    const ledger = await getLedger(env);
    const conns = await ledger.listConnections(principal.subject);
    return json(request, { connections: conns });
  }

  if (path === "/a2a") {
    const token = bearerFrom(request);
    const principal = token ? await (await getLedger(env)).resolvePrincipal(token) : null;
    return handleA2A(request, env, principal);
  }

  if (path === "/mcp") {
    const principal = await principalOr401(request, env);
    if (principal instanceof Response) return principal;
    return mcpHandler(env, principal)(request, env, ctx);
  }

  const agentResponse = await routeAgentRequest(request, env);
  if (agentResponse) return agentResponse;

  return env.ASSETS.fetch(request);
}

async function principalOr401(request: Request, env: Env) {
  const token = bearerFrom(request);
  if (!token) return unauthorized(request, "Missing bearer token.");
  const ledger = await getLedger(env);
  const principal = await ledger.resolvePrincipal(token);
  if (!principal) return unauthorized(request, "Token is invalid, expired, or revoked.");
  return principal;
}

async function enrichReport(env: Env) {
  try {
    const memory = await cortexRecall(env, "fleet-runs", 5);
    if (memory.length > 0) {
      console.log(JSON.stringify({ message: "cortex memory enriched", count: memory.length }));
    }
  } catch (e) {
    // enrichment is best-effort
  }
}
