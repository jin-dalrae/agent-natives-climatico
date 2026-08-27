import type { ActionInput, EvidenceItem, Principal, Receipt } from "./types";
import { evaluatePolicy } from "./policy";
import { gatherEvidence, gatherClassEvidence, isGroundableClass } from "./tavily";
import { workersGroundingSummary } from "./nebius";
import { impactForSource, ABATEMENT } from "./impact";

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
  if (intent === "brief") {
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
  } else if (intent === "assess") {
    const classId = (input.source ?? "").trim().toLowerCase();
    const groundingClass = isGroundableClass(classId);
    const gathered = groundingClass
      ? await gatherClassEvidence(ctx.env, classId)
      : await gatherEvidence(ctx.env, location as string, intent);
    if (!gathered.grounded) {
      return {
        ...base,
        status: "refused",
        refusalCode: "ungrounded",
        refusalReason: groundingClass
          ? `Climatico will not mark ${classId} as live without a real source. Live web evidence (Tavily) was unavailable or empty. It stays modeled.`
          : "Climatico will not invent a climate brief. Live web evidence (Tavily) was unavailable or empty. Retry, or file a watch instead.",
        evidence: [],
      };
    }
    evidence = gathered.evidence;
    if (groundingClass && !base.note) {
      const summary = await workersGroundingSummary(ctx.env, classId, evidence);
      base.note = summary ? `class-assess:${classId}: ${summary}` : `class-assess:${classId}`;
    }
  } else if (intent === "offset" || intent === "watch") {
    const gathered = await gatherEvidence(ctx.env, location as string, intent);
    evidence = gathered.evidence;
  } else if (intent === "abate") {
    const row = impactForSource(input.source);
    const alt = (input.note ?? "").trim() || row.alternative;
    evidence = [
      {
        title: `Modeled abatement plan · ${row.name}`,
        url: "ledger://abatement/modeled",
        snippet: `Run the same business differently on ${row.name} (${row.modeledT} t ±${row.uncertaintyPct}%): ${alt}. ${row.upstream}. Modeled projection — not a measured cut. Baseline ${ABATEMENT.nowT} t → ${ABATEMENT.quarters[ABATEMENT.quarters.length - 1].climaT} t by +24m vs ${ABATEMENT.quarters[ABATEMENT.quarters.length - 1].defaultT} t if nothing changes (−${ABATEMENT.reductionT} t, ${ABATEMENT.reductionPct}%).`,
      },
    ];
    if (!base.note) base.note = alt;
  } else if (intent === "switch") {
    const newSol = input.newSolution || "";
    const priorId = input.priorReceiptId || "";
    const priorAmount = input.priorAmountCents ?? 0;
    const newAmount = input.amountCents ?? 0;
    const delta = Math.max(0, priorAmount - newAmount);
    const oldSolution = input.note?.split("|")[0]?.trim() || "prior solution";
    const switchNote = `switch: ${oldSolution} → ${newSol}. Prior offset ${priorId.slice(0, 8)} at ${priorAmount}¢; new at ${newAmount}¢; delta ${delta}¢ claimable via /v1/actions intent=refund.`;
    if (!base.note) base.note = switchNote;
    evidence = [
      {
        title: `Solution switch · ${newSol}`,
        url: "ledger://switch/logged",
        snippet: `Transitioning from "${oldSolution}" to "${newSol}" at ${location}. Prior offset: ${priorAmount}¢ (receipt ${priorId.slice(0, 8)}). New commitment: ${newAmount}¢. Savings: ${delta}¢ claimable.`,
      },
    ];
  } else if (intent === "refund") {
    const priorId = input.priorReceiptId || "";
    const priorAmount = input.priorAmountCents ?? 0;
    const newAmount = input.amountCents ?? 0;
    const refundCents = Math.max(0, priorAmount - newAmount);
    base.amountCents = refundCents;
    if (!base.note) {
      base.note = `refund of ${refundCents}¢ against prior offset ${priorId.slice(0, 8)} (${priorAmount}¢). New commitment: ${newAmount}¢. Net: ${priorAmount}→${newAmount}¢.`;
    }
    evidence = [
      {
        title: `Offset refund · ${refundCents}¢`,
        url: "ledger://refund/claimed",
        snippet: `Claiming back ${refundCents}¢ against prior receipt ${priorId.slice(0, 8)} (${priorAmount}¢) at ${location}. New commitment: ${newAmount}¢. Net reduction: ${refundCents}¢.`,
      },
    ];
  }

  return {
    ...base,
    status: "committed",
    refusalCode: null,
    refusalReason: null,
    evidence,
  };
}
