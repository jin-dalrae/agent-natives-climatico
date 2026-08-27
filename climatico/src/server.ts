import { routeAgentRequest } from "agents";
import { getAisaBalance } from "./aisa";
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
import { getLedger, Ledger } from "./ledger";
import { mcpHandler } from "./mcp";

export { Clerk, Ledger };

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
} satisfies ExportedHandler<Env>;

async function handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const origin = publicBase(request, env);
  const path = url.pathname.replace(/\/$/, "") || "/";

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

  if (path === "/v1/aisa/balance" && request.method === "GET") {
    const principal = await principalOr401(request, env);
    if (principal instanceof Response) return principal;
    const balance = await getAisaBalance(env);
    return json(request, { balance }, "error" in balance ? 422 : 200);
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
