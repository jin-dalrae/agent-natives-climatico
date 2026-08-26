import type { EvidenceItem } from "./types";

const TAVILY_SEARCH = "https://api.tavily.com/search";

type TavilyHit = {
  title?: string;
  url?: string;
  content?: string;
  snippet?: string;
};

type TavilyResponse = {
  results?: TavilyHit[];
};

export async function gatherEvidence(
  env: Env,
  location: string,
  intent: string,
): Promise<{ evidence: EvidenceItem[]; grounded: boolean; error?: string }> {
  const query = climateQuery(location, intent);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = (env as Env & { TAVILY_API_KEY?: string }).TAVILY_API_KEY;
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  } else {
    headers["X-Tavily-Access-Mode"] = "keyless";
  }

  try {
    const response = await fetch(TAVILY_SEARCH, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query,
        search_depth: "basic",
        max_results: 5,
        include_answer: false,
      }),
    });
    if (!response.ok) {
      const err = `tavily_http_${response.status}`;
      console.error(JSON.stringify({ message: "tavily search failed", error: err, location }));
      return { evidence: [], grounded: false, error: err };
    }
    const body = (await response.json()) as TavilyResponse;
    const evidence = (body.results ?? [])
      .filter((hit) => hit.url)
      .slice(0, 5)
      .map((hit) => ({
        title: hit.title || hit.url || "source",
        url: hit.url as string,
        snippet: (hit.content || hit.snippet || "").slice(0, 280),
      }));
    return { evidence, grounded: evidence.length > 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "tavily_unreachable";
    console.error(JSON.stringify({ message: "tavily search error", error: message, location }));
    return { evidence: [], grounded: false, error: message };
  }
}

function climateQuery(location: string, intent: string): string {
  switch (intent) {
    case "offset":
      return `verified carbon offset protocols and climate risk for ${location}`;
    case "watch":
      return `heat wave air quality climate risk alerts ${location}`;
    case "assess":
      return `climate risk assessment physical risk flood heat drought ${location}`;
    default:
      return `current climate risk heat air quality drought flood ${location} 2026`;
  }
}
