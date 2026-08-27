import type { EvidenceItem } from "./types";

/**
 * Writes a one- or two-sentence summary of why the cited sources support this
 * class's factor, grounded only in the evidence actually passed in. Uses
 * Workers AI (no external key needed). Returns null if the call fails —
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

  try {
    const model = ((env as Env & { AI_MODEL?: string }).AI_MODEL || "@cf/moonshotai/kimi-k2.6") as Parameters<typeof env.AI.run>[0];
    const res = await env.AI.run(model, {
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      stream: false,
    });
    const text = (res as { response?: string }).response?.trim();
    return text || null;
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "workers ai grounding summary error",
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
    return null;
  }
}