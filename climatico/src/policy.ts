import {
  FORBIDDEN_INTENTS,
  INTENTS,
  type ActionInput,
  type Intent,
  type PolicyDecision,
  type Principal,
} from "./types";
import { hasScope } from "./auth";

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
      reason: "Climatico only commits named climate actions: brief, watch, offset, or assess.",
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
      reason: `Unknown intent '${intent}'. Allowed writes: brief, watch, offset, assess.`,
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

  return { allow: true };
}
