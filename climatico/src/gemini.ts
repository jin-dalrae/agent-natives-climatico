/**
 * Google Gemini integration for Climatico.
 * Defaults to Google's Gemini 3.7 Flash (`gemini-3.7-flash`).
 *
 * If GEMINI_API_KEY or GOOGLE_AI_API_KEY is present in env, invokes Gemini 3.7 Flash directly.
 * Otherwise, falls back to Workers AI Google models (@cf/google/gemma-4-26b-a4b-it).
 */

export async function runGemini(
  env: Env,
  prompt: string,
  options?: { maxTokens?: number; temperature?: number },
): Promise<string | null> {
  const apiKey =
    (env as Env & { GEMINI_API_KEY?: string; GOOGLE_AI_API_KEY?: string }).GEMINI_API_KEY?.trim() ||
    (env as Env & { GEMINI_API_KEY?: string; GOOGLE_AI_API_KEY?: string }).GOOGLE_AI_API_KEY?.trim();

  const model = (env as Env & { AI_MODEL?: string }).AI_MODEL?.trim() || "gemini-3.7-flash";

  if (apiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: options?.temperature ?? 0.3,
              maxOutputTokens: options?.maxTokens ?? 300,
            },
          }),
        },
      );
      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
      } else {
        const errText = await res.text();
        console.error("Gemini API error:", res.status, errText);
      }
    } catch (e) {
      console.error("Gemini direct invocation error:", e);
    }
  }

  // Cloudflare Workers AI fallback with Google Gemma 4 (from Gemini 3 research)
  try {
    const fallbackModel = "@cf/google/gemma-4-26b-a4b-it" as Parameters<typeof env.AI.run>[0];
    const res = await env.AI.run(fallbackModel, {
      messages: [{ role: "user", content: prompt }],
      max_tokens: options?.maxTokens ?? 300,
      temperature: options?.temperature ?? 0.3,
      stream: false,
    });
    return (res as { response?: string }).response?.trim() || null;
  } catch (err) {
    try {
      const fallback2 = "@cf/meta/llama-3.3-70b-instruct-fp8-fast" as Parameters<typeof env.AI.run>[0];
      const res = await env.AI.run(fallback2, {
        messages: [{ role: "user", content: prompt }],
        max_tokens: options?.maxTokens ?? 300,
      });
      return (res as { response?: string }).response?.trim() || null;
    } catch {
      return null;
    }
  }
}
