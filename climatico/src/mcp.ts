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
            "Commit a climate action. Allowed intents: brief, watch, offset, assess, abate. Requires location. offset also requires amountCents. abate records a modeled abatement plan for a business source. assess with source set to one of the six non-compute classes (hardware, travel, saas, logistics, electricity, direct) grounds that class in a live Tavily source instead of a modeled default — it stays modeled if no source is found. Refusals persist as receipts.",
          inputSchema: {
            intent: z
              .string()
              .describe("brief | watch | offset | assess | abate. Other values are refused, not guessed."),
            location: z.string().describe("City, site name, or lat,lon."),
            source: z
              .string()
              .optional()
              .describe(
                "For abate: compute | logistics | electricity | travel | hardware | saas | direct. For assess: one of hardware | travel | saas | logistics | electricity | direct to ground that emission class instead of doing a location risk brief.",
              ),
            amountCents: z
              .number()
              .int()
              .optional()
              .describe("Required for offset. Ceiling is the token's maxAmountCents."),
            note: z.string().optional().describe("Free-text context from the calling agent (for abate: the alternative chosen)."),
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
        "switch_solution",
        {
          description:
            "Log a transition to a greener solution. Records the prior offset receipt ID, the prior amount, the new amount, and the new solution. Use this when a fleet run suggested an alternative and the company actually moved. After switching, file a separate 'refund' to claim back the difference from the prior provider.",
          inputSchema: {
            location: z.string().describe("City, site name, or lat,lon — the same place as the prior offset."),
            newSolution: z.string().describe("What you're switching to. e.g. 'move compute to FRA region', 'switch to electric freight'."),
            priorReceiptId: z.string().describe("Receipt ID of the prior offset you're replacing."),
            priorAmountCents: z.number().int().describe("How much the prior offset cost, in cents."),
            amountCents: z.number().int().describe("How much the new (smaller) commitment is, in cents."),
            note: z.string().optional().describe("Free-text context."),
            idempotencyKey: z.string().optional().describe("Replay-safe key."),
          },
        },
        async (args) => {
          if (!hasScope(principal, "climatico:transact")) {
            return text({ ok: false, refused: true, code: "missing_scope" }, true);
          }
          const ledger = await getLedger(env);
          const receipt = await ledger.runAction(
            {
              intent: "switch",
              location: args.location,
              newSolution: args.newSolution,
              priorReceiptId: args.priorReceiptId,
              priorAmountCents: args.priorAmountCents,
              amountCents: args.amountCents,
              note: args.note,
              idempotencyKey: args.idempotencyKey,
            },
            principal,
          );
          return text({ ok: receipt.status === "committed", refused: receipt.status === "refused", receipt });
        },
      );

      server.registerTool(
        "claim_refund",
        {
          description:
            "Claim a refund on a prior offset. Use after a 'switch_solution' that reduced the carbon commitment. The refund is the difference between the prior and new amounts. The provider agent processes the refund and records a reversal receipt.",
          inputSchema: {
            location: z.string().describe("The same place as the prior offset."),
            priorReceiptId: z.string().describe("Receipt ID of the prior offset being refunded."),
            priorAmountCents: z.number().int().describe("The prior offset amount, in cents."),
            amountCents: z.number().int().describe("The new (smaller) commitment, in cents. Refund = prior - new."),
            note: z.string().optional().describe("Free-text context."),
            idempotencyKey: z.string().optional().describe("Replay-safe key."),
          },
        },
        async (args) => {
          if (!hasScope(principal, "climatico:transact")) {
            return text({ ok: false, refused: true, code: "missing_scope" }, true);
          }
          const ledger = await getLedger(env);
          const receipt = await ledger.runAction(
            {
              intent: "refund",
              location: args.location,
              priorReceiptId: args.priorReceiptId,
              priorAmountCents: args.priorAmountCents,
              amountCents: args.amountCents,
              note: args.note,
              idempotencyKey: args.idempotencyKey,
            },
            principal,
          );
          const refundCents = Math.max(0, args.priorAmountCents - args.amountCents);
          try {
            const provider = await (await import("./provider")).getProviderAgent(env, "green-offset-co");
            await provider.reverseOffset({
              priorReceiptId: args.priorReceiptId,
              priorAmountCents: args.priorAmountCents,
              newAmountCents: args.amountCents,
              location: args.location,
            });
          } catch (_) {
          }
          return text({ ok: receipt.status === "committed", refused: receipt.status === "refused", receipt, refundCents });
        },
      );

      server.registerTool(
        "file_freight",
        {
          description:
            "File a real freight leg (PO / booking) and score it: mode, weight, distance → kg CO2e. Refuses if live logistics-factor evidence (Tavily) can't ground the heuristic. This is the PO/freight write path — a real booking, not a stubbed LCA. Requires climatico:transact.",
          inputSchema: {
            location: z.string().describe("Origin, destination, or lane — e.g. 'Shenzhen → Oakland'."),
            freightMode: z.enum(["sea", "air", "road", "rail"]).describe("Transport mode for this leg."),
            weightKg: z.number().positive().describe("Shipment weight in kg."),
            distanceKm: z.number().positive().describe("Leg distance in km."),
            note: z.string().optional().describe("Free-text context, e.g. PO number."),
            idempotencyKey: z.string().optional().describe("Replay-safe key."),
          },
        },
        async (args) => {
          if (!hasScope(principal, "climatico:transact")) {
            return text({ ok: false, refused: true, code: "missing_scope" }, true);
          }
          const ledger = await getLedger(env);
          const receipt = await ledger.runAction(
            {
              intent: "freight",
              location: args.location,
              freightMode: args.freightMode,
              weightKg: args.weightKg,
              distanceKm: args.distanceKm,
              note: args.note,
              idempotencyKey: args.idempotencyKey,
            },
            principal,
          );
          return text({ ok: receipt.status === "committed", refused: receipt.status === "refused", receipt });
        },
      );

      server.registerTool(
        "plan_abatement",
        {
          description:
            "File a modeled abatement plan against a business source (compute, logistics, electricity, travel, hardware, saas, direct). Returns the modeled impact today, the alternative way to run the same business, and the projected +12m/+24m reduction. Requires climatico:transact. The reduction is a labeled MODELED projection, not a measured cut.",
          inputSchema: {
            location: z.string().describe("City, site name, or lat,lon."),
            source: z
              .string()
              .optional()
              .describe("compute | logistics | electricity | travel | hardware | saas | direct. Default compute."),
            note: z.string().optional().describe("The alternative chosen for this source."),
          },
        },
        async (args) => {
          if (!hasScope(principal, "climatico:transact")) {
            return text({ ok: false, refused: true, code: "missing_scope" }, true);
          }
          const ledger = await getLedger(env);
          const receipt = await ledger.runAction(
            { intent: "abate", location: args.location, source: args.source, note: args.note },
            principal,
          );
          return text({ ok: receipt.status === "committed", refused: receipt.status === "refused", receipt });
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
        "start_sandbox_check",
        {
          description:
            "Provision a real Tenki sandbox VM to independently verify a claim (e.g. re-derive an audit factor, fetch a source Climatico's own Worker cannot reach). Returns a real sessionId. The Worker cannot execute commands inside the sandbox itself — the caller must exec the command there (Tenki CLI/SDK) and report the real output back via complete_sandbox_check. Requires climatico:transact.",
          inputSchema: {
            command: z.string().describe("The command you intend to run in the sandbox, for the record."),
          },
        },
        async ({ command }) => {
          const ledger = await getLedger(env);
          const check = await ledger.startSandboxCheck(command, principal);
          return text(check, "error" in check);
        },
      );

      server.registerTool(
        "complete_sandbox_check",
        {
          description:
            "Report the real output of a command you ran in a Tenki sandbox created by start_sandbox_check. Refused if sessionId was never created by this ledger, or if Tenki's control plane no longer recognizes it — this desk does not accept invented output.",
          inputSchema: {
            sessionId: z.string().describe("The sessionId returned by start_sandbox_check."),
            output: z.string().describe("The real stdout/output from executing the command in that sandbox."),
          },
        },
        async ({ sessionId, output }) => {
          const ledger = await getLedger(env);
          const check = await ledger.completeSandboxCheck(sessionId, output, principal);
          return text(check, "error" in check);
        },
      );

      server.registerTool(
        "get_insights",
        {
          description:
            "Assessment dashboard: emission classes, L0–L5 onboarding, inbox of actionable messages, sponsor next steps.",
          inputSchema: {},
        },
        async () => {
          const ledger = await getLedger(env);
          return text(await ledger.workspace());
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
