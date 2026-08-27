import {
  FORBIDDEN_INTENTS,
  INTENTS,
  type ActionInput,
  type Intent,
  type PolicyDecision,
  type Principal,
} from "./types";
import { hasScope } from "./auth";

const FREIGHT_MODES = ["sea", "air", "road", "rail"] as const;

export function isIntent(value: string): value is Intent {
  return (INTENTS as readonly string[]).includes(value);
}

export function evaluatePolicy(input: ActionInput, principal: Principal): PolicyDecision {
  const intent = (input.intent ?? "").trim().toLowerCase();
  const location = (input.location ?? "").trim();

  if (!intent) {
    return {
      allow: false,
      code: "intent_required",
      reason: "Climatico only commits named climate actions: brief, watch, offset, assess, abate, switch, refund, freight.",
    };
  }

  if ((FORBIDDEN_INTENTS as readonly string[]).includes(intent)) {
    return {
      allow: false,
      code: "forbidden_intent",
      reason: `${intent} is outside Climatico's mandate. The desk files climate actions; it does not move money off-product, delete accounts, or mint unverified green claims.`,
    };
  }

  if (!isIntent(intent)) {
    return {
      allow: false,
      code: "unknown_intent",
      reason: `Unknown intent '${intent}'. Allowed writes: brief, watch, offset, assess, abate, switch, refund, freight.`,
    };
  }

  if (!hasScope(principal, "climatico:transact")) {
    return {
      allow: false,
      code: "missing_scope",
      reason: "This credential has climatico:read only. Mint a token with climatico:transact to write.",
    };
  }

  if (!location) {
    return {
      allow: false,
      code: "location_required",
      reason: "Every Climatico write is grounded in a place. Pass location (city, site, or lat,lon).",
    };
  }

  if (intent === "offset") {
    const amount = input.amountCents ?? 0;
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        allow: false,
        code: "amount_required",
        reason: "offset requires amountCents greater than 0. This is a real commit, not a slogan.",
      };
    }
    if (amount > principal.maxAmountCents) {
      return {
        allow: false,
        code: "amount_exceeds_scope",
        reason: `This token may commit at most ${principal.maxAmountCents} cents. Request climatico:admin or a smaller offset.`,
      };
    }
  }

  if (intent === "switch") {
    if (!input.newSolution) {
      return {
        allow: false,
        code: "new_solution_required",
        reason: "switch requires newSolution: what you're switching to. Climatico logs the transition so the old offset can be reversed later.",
      };
    }
  }

  if (intent === "refund") {
    if (!input.priorReceiptId) {
      return {
        allow: false,
        code: "prior_receipt_required",
        reason: "refund requires priorReceiptId: which offset receipt you're claiming back. Climatico won't refund without a record of the prior commit.",
      };
    }
    if ((input.priorAmountCents ?? 0) <= 0) {
      return {
        allow: false,
        code: "prior_amount_required",
        reason: "refund requires priorAmountCents > 0. How much was the prior offset? Pass it so we can compute the delta.",
      };
    }
  }

  if (intent === "freight") {
    const mode = (input.freightMode ?? "").trim().toLowerCase();
    if (!(FREIGHT_MODES as readonly string[]).includes(mode)) {
      return {
        allow: false,
        code: "freight_mode_required",
        reason: `freight requires freightMode: one of ${FREIGHT_MODES.join(", ")}.`,
      };
    }
    if (!Number.isFinite(input.weightKg) || (input.weightKg ?? 0) <= 0) {
      return {
        allow: false,
        code: "weight_required",
        reason: "freight requires weightKg > 0 — the shipment weight. This is a real booking, not an estimate.",
      };
    }
    if (!Number.isFinite(input.distanceKm) || (input.distanceKm ?? 0) <= 0) {
      return {
        allow: false,
        code: "distance_required",
        reason: "freight requires distanceKm > 0 — the leg distance.",
      };
    }
  }

  return { allow: true };
}
