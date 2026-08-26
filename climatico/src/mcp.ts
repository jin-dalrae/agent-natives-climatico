import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";
import { hasScope } from "./auth";
import { getLedger } from "./ledger";
import type { Principal } from "./types";

export function mcpHandler(env: Env, principal: Principal) {
  return createMcpHandler(
    () => {
      const server = new McpServer({
        name: "climatico",
        version: "0.1.0",
      });

      server.registerTool(
        "discover_climatico",
        {
          description:
            "What Climatico is, which writes it accepts, and how credentials work. Call this first.",
          inputSchema: {},
        },
        async () => text(await policy(env)),
      );

      server.registerTool(
        "get_policy",
        {
          description: "Allowed intents, refusal rules, and scope ceilings.",
          inputSchema: {},
        },
        async () => text(await policy(env)),
      );

      server.registerTool(
        "whoami",
        {
          description: "The scoped identity on this request. Does not return the secret token.",
          inputSchema: {},
        },
        async () =>
          text({
            subject: principal.subject,
            scopes: principal.scopes,
            maxAmountCents: principal.maxAmountCents,
            tokenId: principal.tokenId,
            expiresAt: principal.expiresAt,
          }),
      );

      server.registerTool(
        "complete_action",
        {
          description:
            "Commit a climate action. This is a write. Allowed intents: brief, watch, offset, assess. Requires location. offset also requires amountCents. Refusals persist as receipts.",
          inputSchema: {
            intent: z
              .string()
              .describe("brief | watch | offset | assess. Other values are refused, not guessed."),
            location: z.string().describe("City, site name, or lat,lon."),
            amountCents: z
              .number()
              .int()
              .optional()
              .describe("Required for offset. Ceiling is the token's maxAmountCents."),
            note: z.string().optional().describe("Free-text context from the calling agent."),
            idempotencyKey: z
              .string()
              .optional()
              .describe("Replay-safe key. A retry returns the original receipt."),
          },
        },
        async (args) => {
          if (!hasScope(principal, "climatico:transact")) {
            return text(
              {
                ok: false,
                refused: true,
                code: "missing_scope",
                reason: "Mint a credential with climatico:transact to write.",
              },
              true,
            );
          }
          const ledger = await getLedger(env);
          const receipt = await ledger.runAction(
            {
              intent: args.intent,
              location: args.location,
              amountCents: args.amountCents,
              note: args.note,
              idempotencyKey: args.idempotencyKey,
            },
            principal,
          );
          return text({
            ok: receipt.status === "committed",
            refused: receipt.status === "refused",
            receipt,
          });
        },
      );

      server.registerTool(
        "get_receipt",
        {
          description: "Fetch one durable receipt by id, including refusals.",
          inputSchema: { id: z.string().describe("Receipt UUID") },
        },
        async ({ id }) => {
          const ledger = await getLedger(env);
          const receipt = await ledger.getReceipt(id);
          if (!receipt) return text({ error: "not_found", id }, true);
          return text(receipt);
        },
      );

      server.registerTool(
        "run_fleet",
        {
          description:
            "Run the ingest → audit → settle fleet. Ingest a usage spike, score kgCO2e against a monthly budget, and commit an offset if over. Writes durable handoffs. Requires climatico:transact.",
          inputSchema: {
            source: z.string().optional().describe("cloud | saas | travel"),
            location: z.string().describe("Region or site, e.g. SJC or Oakland port"),
            spendUsd: z.number().describe("Usage spend that just spiked, in USD"),
            monthlyBudgetKg: z.number().optional().describe("Monthly kgCO2e budget. Default 50."),
            monthToDateKg: z.number().optional().describe("Already booked kg this month. Default 40."),
          },
        },
        async (args) => {
          if (!hasScope(principal, "climatico:transact")) {
            return text(
              { ok: false, refused: true, code: "missing_scope" },
              true,
            );
          }
          const ledger = await getLedger(env);
          const run = await ledger.runFleet(args, principal);
          return text({
            ok: run.status === "committed",
            refused: run.status === "refused",
            run,
          });
        },
      );

      server.registerTool(
        "list_handoffs",
        {
          description: "Coordination log: ingest → audit → settle messages, newest first.",
          inputSchema: {
            limit: z.number().int().min(1).max(80).optional(),
          },
        },
        async ({ limit }) => {
          const ledger = await getLedger(env);
          return text({ handoffs: await ledger.listHandoffs(limit ?? 30) });
        },
      );

      server.registerTool(
        "list_receipts",
        {
          description: "Recent receipts, newest first. Proof of what was committed and what was refused.",
          inputSchema: {
            limit: z.number().int().min(1).max(50).optional(),
          },
        },
        async ({ limit }) => {
          const ledger = await getLedger(env);
          return text({ receipts: await ledger.listReceipts(limit ?? 20) });
        },
      );

      return server;
    },
    { route: "/mcp" },
  );
}

async function policy(env: Env) {
  const ledger = await getLedger(env);
  return await ledger.policyDoc();
}

function text(body: unknown, isError = false) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(body, null, 2) }],
    isError,
  };
}
