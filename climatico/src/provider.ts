import { Agent, callable, getAgentByName } from "agents";
import type { Handoff, Receipt } from "./types";

/**
 * A 3rd-party service provider agent. Third parties (offset providers,
 * sustainability consultants, green energy vendors) deploy instances of
 * this agent and expose services that Climatico's agents can call.
 *
 * Each instance represents one provider on the mesh.
 */
export class ProviderAgent extends Agent<Env, { services: string[]; contracts: number; revenueCents: number }> {
  initialState = { services: ["offset-fulfillment", "sustainability-consulting"], contracts: 0, revenueCents: 0 };

  async onStart() {
    // nothing yet
  }

  @callable()
  discover(): { name: string; services: string[] } {
    return {
      name: (this.env as Env & { PROVIDER_NAME?: string }).PROVIDER_NAME || "green-provider",
      services: this.state.services,
    };
  }

  /**
   * A provider fulfills an offset request. Takes the handoff from Climatico's
   * settle agent and returns a fulfillment receipt.
   */
  @callable()
  fulfillOffset(handoff: Handoff): { ok: boolean; fulfillmentId: string; priceCents: number; note: string } {
    const priceCents = Math.round(((handoff.body as { amountCents?: number })?.amountCents ?? 100) * 1.05);
    this.setState({
      ...this.state,
      contracts: this.state.contracts + 1,
      revenueCents: this.state.revenueCents + priceCents,
    });
    return {
      ok: true,
      fulfillmentId: `f-${crypto.randomUUID().slice(0, 8)}`,
      priceCents,
      note: `Offset fulfilled by ${this.env.PROVIDER_NAME || "green-provider"} at ${priceCents}¢. Certificate available.`,
    };
  }

  /**
   * A provider reviews a receipt and gives an expert opinion.
   */
  @callable()
  review(receipt: Receipt): { ok: boolean; opinion: string } {
    return {
      ok: true,
      opinion: receipt.status === "committed"
        ? `Reviewed receipt ${receipt.id.slice(0, 8)}: ${receipt.amountCents ? `$${receipt.amountCents / 100} at ${receipt.location}. ` : ""}Evidence quality: ${receipt.evidence.length} sources. Recommendation: file a watch to track this location continuously.`
        : `Reviewed refusal ${receipt.id.slice(0, 8)}: ${receipt.refusalReason || receipt.refusalCode}. Recommendation: address the policy issue before retrying.`,
    };
  }

  @callable()
  getStatus(): { services: string[]; contracts: number; revenueCents: number } {
    return {
      services: this.state.services,
      contracts: this.state.contracts,
      revenueCents: this.state.revenueCents,
    };
  }

  @callable()
  reverseOffset(input: { priorReceiptId: string; priorAmountCents: number; newAmountCents: number; location: string }): { ok: boolean; refundId: string; refundCents: number; note: string } {
    const refundCents = Math.max(0, input.priorAmountCents - input.newAmountCents);
    this.setState({
      ...this.state,
      contracts: this.state.contracts + 1,
      revenueCents: Math.max(0, this.state.revenueCents - refundCents),
    });
    return {
      ok: true,
      refundId: `r-${crypto.randomUUID().slice(0, 8)}`,
      refundCents,
      note: `Refunded ${refundCents}¢ against prior receipt ${input.priorReceiptId.slice(0, 8)} at ${input.location}. New commitment: ${input.newAmountCents}¢.`,
    };
  }
}

export async function getProviderAgent(env: Env, name: string = "green-offset-co") {
  return getAgentByName(env.ProviderAgent, name) as unknown as InstanceType<typeof ProviderAgent>;
}

export type ProviderAgentApi = {
  discover: () => Promise<{ name: string; services: string[] }>;
  fulfillOffset: (handoff: Handoff) => Promise<{ ok: boolean; fulfillmentId: string; priceCents: number; note: string }>;
  review: (receipt: Receipt) => Promise<{ ok: boolean; opinion: string }>;
  getStatus: () => Promise<{ services: string[]; contracts: number; revenueCents: number }>;
};