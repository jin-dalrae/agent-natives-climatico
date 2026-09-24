import type { EvidenceItem } from "./types";
import { geminiSummarizeAbatement, gatherGeminiEvidence } from "./gemini";

const TAVILY_SEARCH = "https://api.tavily.com/search";

type TavilyHit = { title?: string; url?: string; content?: string; snippet?: string };
type TavilyResponse = { results?: TavilyHit[] };

/**
 * Searches for real, current greener alternatives / abatement strategies for a
 * specific business source. Uses Gemini Search Grounding or Tavily fallback.
 */
export async function researchAlternatives(
  env: Env,
  className: string,
  location: string,
): Promise<{ suggestions: EvidenceItem[]; grounded: boolean }> {
  const geminiKey = (env as Env & { GEMINI_API_KEY?: string }).GEMINI_API_KEY?.trim();
  if (geminiKey) {
    const res = await gatherGeminiEvidence(env, `${className} at ${location}`, "abate");
    if (res.grounded && res.evidence.length > 0) {
      return { suggestions: res.evidence.slice(0, 3), grounded: true };
    }
  }

  const query = `${className} emission reduction greener alternatives best practices ${location} 2026`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = (env as Env & { TAVILY_API_KEY?: string }).TAVILY_API_KEY;
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  } else {
    headers["X-Tavily-Access-Mode"] = "keyless";
  }

  try {
    const res = await fetch(TAVILY_SEARCH, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, search_depth: "advanced", max_results: 3, include_answer: false }),
    });
    if (!res.ok) return { suggestions: [], grounded: false };
    const body = (await res.json()) as TavilyResponse;
    const suggestions = (body.results ?? [])
      .filter((h) => h.url)
      .slice(0, 3)
      .map((h) => ({
        title: h.title || h.url || "source",
        url: h.url as string,
        snippet: (h.content || h.snippet || "").slice(0, 280),
      }));
    return { suggestions, grounded: suggestions.length > 0 };
  } catch {
    return { suggestions: [], grounded: false };
  }
}

/**
 * Uses Gemini API to generate a plain-English abatement plan from research results.
 * Returns null on failure — never invents.
 */
export async function summarizeAbatement(
  env: Env,
  className: string,
  currentTons: number,
  alternatives: EvidenceItem[],
): Promise<string | null> {
  return geminiSummarizeAbatement(env, className, currentTons, alternatives);
}
