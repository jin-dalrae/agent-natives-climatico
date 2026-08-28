import type { EvidenceItem } from "./types";
import { runGemini } from "./gemini";

/**
 * Writes a one- or two-sentence summary of why the cited sources support this
 * class's factor, grounded only in the evidence actually passed in. Uses
 * Google Gemini 3.7 Flash (with Workers AI Google Gemma fallback). Returns null if the call fails —
 * callers fall back to storing the evidence without a narrative.
 */
export async function workersGroundingSummary(
  env: Env,
  className: string,
  evidence: EvidenceItem[],
): Promise<string | null> {
  if (evidence.length === 0) return null;

  const sources = evidence
    .slice(0, 5)
    .map((e, i) => `${i + 1}. ${e.title} — ${e.snippet}`)
    .join("\n");

  const prompt = `You are grounding an emission factor for the class "${className}". Using only the sources below, write one or two plain-English sentences on what they establish about this class's emission factor or methodology. Do not invent a number that is not in the sources. If the sources don't support a specific factor, say what they do establish instead.\n\nSources:\n${sources}`;

  return runGemini(env, prompt, { maxTokens: 150, temperature: 0.3 });
}