import type { EvidenceItem } from "./types";

const NEBIUS_BASE_URL = "https://api.tokenfactory.nebius.com/v1";
const NEBIUS_MODEL = "deepseek-ai/DeepSeek-V4-Flash";

/**
 * Writes a one- or two-sentence summary of why the cited sources support this
 * class's factor, grounded only in the evidence actually passed in. Returns
 * null (never a guess) if NEBIUS_API_KEY is unset or the call fails — callers
 * fall back to storing the evidence without a narrative, same as before.
 */
export async function nebiusGroundingSummary(
  env: Env,
  className: string,
  evidence: EvidenceItem[],
): Promise<string | null> {
  const key = (env as Env & { NEBIUS_API_KEY?: string }).NEBIUS_API_KEY?.trim();
  if (!key || evidence.length === 0) return null;

  const sources = evidence
    .slice(0, 5)
    .map((e, i) => `${i + 1}. ${e.title} — ${e.snippet}`)
    .join("\n");

  const prompt = `You are grounding an emission factor for the class "${className}". Using only the sources below, write one or two plain-English sentences on what they establish about this class's emission factor or methodology. Do not invent a number that is not in the sources. If the sources don't support a specific factor, say what they do establish instead.\n\nSources:\n${sources}`;

  try {
    const res = await fetch(`${NEBIUS_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: NEBIUS_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.3,
        // Without a frequency penalty this model gets stuck repeating a phrase
        // until it hits max_tokens.
        frequency_penalty: 0.6,
        // This model reasons by default and burns the token budget on hidden
        // chain-of-thought with no room left for content. Turn it off — we want
        // a short grounded sentence, not a reasoning trace.
        chat_template_kwargs: { thinking: false },
      }),
    });
    if (!res.ok) {
      console.error(JSON.stringify({ message: "nebius call failed", status: res.status }));
      return null;
    }
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "nebius call error",
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
    return null;
  }
}
