import type { EvidenceItem } from "./types";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export type GeminiOptions = {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  tools?: Array<Record<string, unknown>>;
};

type GeminiCandidate = {
  content?: {
    parts?: Array<{ text?: string }>;
    role?: string;
  };
  finishReason?: string;
  groundingMetadata?: {
    webSearchQueries?: string[];
    groundingChunks?: Array<{
      web?: {
        uri?: string;
        title?: string;
      };
    }>;
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
  error?: {
    code: number;
    message: string;
    status: string;
  };
};

export async function callGemini(
  env: Env,
  prompt: string,
  options?: GeminiOptions,
): Promise<{ text: string | null; candidate: GeminiCandidate | null; error?: string }> {
  const apiKey = (env as Env & { GEMINI_API_KEY?: string }).GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return { text: null, candidate: null, error: "missing_gemini_api_key" };
  }

  const model = options?.model || (env as Env & { AI_MODEL?: string }).AI_MODEL || "gemini-1.5-flash";
  const url = `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`;
  const body: Record<string, unknown> = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: options?.temperature ?? 0.2,
      maxOutputTokens: options?.maxOutputTokens ?? 400,
    },
  };

  if (options?.tools && options.tools.length > 0) {
    body.tools = options.tools;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(
        JSON.stringify({
          message: "gemini api error",
          status: res.status,
          error: errText.slice(0, 300),
        }),
      );
      return { text: null, candidate: null, error: `gemini_http_${res.status}` };
    }

    const data = (await res.json()) as GeminiResponse;
    if (data.error) {
      return { text: null, candidate: null, error: data.error.message };
    }

    const candidate = data.candidates?.[0] ?? null;
    const text = candidate?.content?.parts?.[0]?.text?.trim() ?? null;
    return { text, candidate };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown_error";
    console.error(JSON.stringify({ message: "gemini request failed", error: msg }));
    return { text: null, candidate: null, error: msg };
  }
}

export async function geminiGroundingSummary(
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

  const { text } = await callGemini(env, prompt, { maxOutputTokens: 150, temperature: 0.2 });
  return text;
}

export async function geminiSummarizeAbatement(
  env: Env,
  className: string,
  currentTons: number,
  alternatives: EvidenceItem[],
): Promise<string | null> {
  if (alternatives.length === 0) return null;

  const sources = alternatives.map((a, i) => `${i + 1}. ${a.title}: ${a.snippet}`).join("\n");
  const prompt = `The company's "${className}" emits ${currentTons} tonnes CO2e/year (modeled). Based ONLY on these real sources, suggest 2-3 concrete ways to reduce it. Be specific — name technologies, methods, or vendors if mentioned. If sources don't support a specific reduction, say what they do establish.\n\nSources:\n${sources}`;

  const { text } = await callGemini(env, prompt, { maxOutputTokens: 300, temperature: 0.3 });
  return text;
}

export async function gatherGeminiEvidence(
  env: Env,
  locationOrQuery: string,
  intent: string,
): Promise<{ evidence: EvidenceItem[]; grounded: boolean; text?: string; error?: string }> {
  const query = `Provide current climate, emissions, or environmental risk data and verified references for: ${locationOrQuery} (${intent})`;
  const { text, candidate, error } = await callGemini(env, query, {
    tools: [{ google_search: {} }],
    temperature: 0.1,
    maxOutputTokens: 300,
  });

  if (error || !candidate) {
    return { evidence: [], grounded: false, error };
  }

  const chunks = candidate.groundingMetadata?.groundingChunks ?? [];
  const evidence: EvidenceItem[] = chunks
    .filter((c) => c.web?.uri)
    .slice(0, 5)
    .map((c) => ({
      title: c.web?.title || c.web?.uri || "Google Search Grounding Source",
      url: c.web?.uri as string,
      snippet: (text || "").slice(0, 280),
    }));

  return {
    evidence,
    grounded: evidence.length > 0,
    text: text ?? undefined,
  };
}
