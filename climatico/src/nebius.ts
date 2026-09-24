import type { EvidenceItem } from "./types";
import { geminiGroundingSummary } from "./gemini";

/**
 * Summarizes grounding evidence using Gemini API.
 * Re-exports for backward compatibility after decoupling sponsor SDKs.
 */
export async function workersGroundingSummary(
  env: Env,
  className: string,
  evidence: EvidenceItem[],
): Promise<string | null> {
  return geminiGroundingSummary(env, className, evidence);
}
