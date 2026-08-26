import type { ActionInput, EvidenceItem, Principal, Receipt } from "./types";
import { evaluatePolicy } from "./policy";
import { gatherEvidence } from "./tavily";

export type GraphContext = {
  env: Env;
  now: number;
  newId: () => string;
  findByIdempotency: (key: string) => Receipt | null;
};

export async function runActionGraph(
  input: ActionInput,
  principal: Principal,
  ctx: GraphContext,
): Promise<Receipt> {
  if (input.idempotencyKey) {
    const existing = ctx.findByIdempotency(input.idempotencyKey);
    if (existing) return existing;
  }

  const decision = evaluatePolicy(input, principal);
  const intent = (input.intent ?? "").trim().toLowerCase();
  const location = (input.location ?? "").trim() || null;
  const base = {
    id: ctx.newId(),
    intent,
    location,
    amountCents: input.amountCents ?? null,
    note: input.note ?? null,
    subject: principal.subject,
    tokenId: principal.tokenId,
    idempotencyKey: input.idempotencyKey ?? null,
    createdAt: ctx.now,
  };

  if (!decision.allow) {
    return {
      ...base,
      status: "refused",
      refusalCode: decision.code,
      refusalReason: decision.reason,
      evidence: [],
    };
  }

  let evidence: EvidenceItem[] = [];
  if (intent === "brief" || intent === "assess") {
    const gathered = await gatherEvidence(ctx.env, location as string, intent);
    if (!gathered.grounded) {
      return {
        ...base,
        status: "refused",
        refusalCode: "ungrounded",
        refusalReason:
          "Climatico will not invent a climate brief. Live web evidence (Tavily) was unavailable or empty. Retry, or file a watch instead.",
        evidence: [],
      };
    }
    evidence = gathered.evidence;
  } else if (intent === "offset" || intent === "watch") {
    const gathered = await gatherEvidence(ctx.env, location as string, intent);
    evidence = gathered.evidence;
  }

  return {
    ...base,
    status: "committed",
    refusalCode: null,
    refusalReason: null,
    evidence,
  };
}
