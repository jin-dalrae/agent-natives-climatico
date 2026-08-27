const AISA_BASE_URL = "https://api.aisa.one/v1";

export type AisaBalance = {
  currency: string;
  accountBalanceMicrosUsd: number;
  availableBalanceMicrosUsd: number;
  keyRemainingMicrosUsd: number | null;
  keyUnlimited: boolean;
  asOf: string;
};

/**
 * GET /v1/credits/balance is documented as read-only and free — it reads wallet
 * state, it does not spend from it. This is deliberately the only AIsa call this
 * product makes: real machine-to-machine payment settlement is a separate write
 * this desk does not make without a specific, bounded, human-confirmed instruction.
 */
export async function getAisaBalance(env: Env): Promise<AisaBalance | { error: string }> {
  const key = (env as Env & { AISA_API_KEY?: string }).AISA_API_KEY?.trim();
  if (!key) return { error: "AISA_API_KEY not configured" };
  try {
    const res = await fetch(`${AISA_BASE_URL}/credits/balance`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      return { error: `AIsa returned ${res.status}` };
    }
    const body = (await res.json()) as {
      currency: string;
      account_balance_micros_usd: number;
      available_balance_micros_usd: number;
      api_key?: { unlimited?: boolean; remaining_micros_usd?: number };
      as_of: string;
    };
    return {
      currency: body.currency,
      accountBalanceMicrosUsd: body.account_balance_micros_usd,
      availableBalanceMicrosUsd: body.available_balance_micros_usd,
      keyRemainingMicrosUsd: body.api_key?.remaining_micros_usd ?? null,
      keyUnlimited: Boolean(body.api_key?.unlimited),
      asOf: body.as_of,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "AIsa balance check failed" };
  }
}
