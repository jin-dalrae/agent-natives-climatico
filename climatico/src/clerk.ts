import { Think } from "@cloudflare/think";
import { tool } from "ai";
import { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createWorkersAI } from "workers-ai-provider";
import { getLedger } from "./ledger";

export class Clerk extends Think<Env> {
  getModel() {
    const apiKey =
      (this.env as Env & { GEMINI_API_KEY?: string; GOOGLE_AI_API_KEY?: string }).GEMINI_API_KEY?.trim() ||
      (this.env as Env & { GEMINI_API_KEY?: string; GOOGLE_AI_API_KEY?: string }).GOOGLE_AI_API_KEY?.trim();

    if (apiKey) {
      const google = createGoogleGenerativeAI({ apiKey });
      const model = (this.env as Env & { AI_MODEL?: string }).AI_MODEL?.trim() || "gemini-3.7-flash";
      return google(model);
    }

    const fallback = (this.env as Env & { AI_MODEL?: string }).AI_MODEL || "@cf/google/gemma-4-26b-a4b-it";
    return createWorkersAI({ binding: this.env.AI })(fallback as Parameters<ReturnType<typeof createWorkersAI>>[0]);
  }

  getSystemPrompt() {
    return [
      "You are the Climatico clerk.",
      "Climatico is an agent-native climate action desk.",
      "You file briefs, watches, offsets, and site assessments against a place.",
      "You never invent climate facts. Tools persist a receipt even when they flag.",
      "If a caller asks for a payout, greenwash claim, or action without a location, call complete_action and let policy flag it.",
      "Always show the receipt id, status, and flag reason when present.",
    ].join(" ");
  }

  getTools() {
    return {
      complete_action: tool({
        description: "Commit or flag a climate action. Writes a durable receipt.",
        inputSchema: z.object({
          intent: z.enum(["brief", "watch", "offset", "assess"]),
          location: z.string(),
          amountCents: z.number().int().optional(),
          note: z.string().optional(),
        }),
        execute: async ({ intent, location, amountCents, note }) => {
          const ledger = await getLedger(this.env);
          const minted = await ledger.mintCredential({
            subject: `clerk:${this.name}`,
            scopes: ["climatico:read", "climatico:transact"],
          });
          return await ledger.runAction({ intent, location, amountCents, note }, minted.principal);
        },
      }),
      list_receipts: tool({
        description: "List recent Climatico receipts.",
        inputSchema: z.object({ limit: z.number().int().optional() }),
        execute: async ({ limit }) => {
          const ledger = await getLedger(this.env);
          return await ledger.listReceipts(limit ?? 10);
        },
      }),
      get_policy: tool({
        description: "Climatico allow and flag rules.",
        inputSchema: z.object({}),
        execute: async () => {
          const ledger = await getLedger(this.env);
          return await ledger.policyDoc();
        },
      }),
      run_fleet: tool({
        description: "Ingest a usage spike, audit kgCO2e, settle an offset if over budget.",
        inputSchema: z.object({
          location: z.string(),
          spendUsd: z.number(),
          source: z.string().optional(),
        }),
        execute: async ({ location, spendUsd, source }) => {
          const ledger = await getLedger(this.env);
          const minted = await ledger.mintCredential({
            subject: `clerk:${this.name}`,
            scopes: ["climatico:read", "climatico:transact"],
          });
          return await ledger.runFleet({ location, spendUsd, source }, minted.principal);
        },
      }),
      get_insights: tool({
        description: "Assessment: composition, maturity, inbox, sponsor next steps.",
        inputSchema: z.object({}),
        execute: async () => {
          const ledger = await getLedger(this.env);
          return await ledger.workspace();
        },
      }),
    };
  }
}
