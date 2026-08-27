import type { FleetRun } from "./types";

const RUNTPE_API = "https://api.runtype.com/v1";

/**
 * Wires Runtype's agent platform. Uses the stored API key to invoke a
 * Runtype agent that can run climate analysis tasks and return structured
 * results. Returns null if the key is unset or the call fails.
 */
export async function runtypeAnalysis(
  env: Env,
  task: "audit" | "suggest" | "forecast",
  data: { location?: string; kg?: number; spend?: number; trend?: string },
): Promise<string | null> {
  const key = (env as Env & { RUNTPE_API_KEY?: string }).RUNTPE_API_KEY?.trim();
  if (!key) return null;

  const prompts: Record<string, string> = {
    audit: `Analyze this emission data: ${data.location} ${data.kg}kg from $${data.spend} spend. Compare to typical cloud emissions for this region. Give a one-paragraph audit finding.`,
    suggest: `Given ${data.kg}kg over budget at ${data.location}, suggest 2-3 specific reduction strategies backed by real practices.`,
    forecast: `Given trend "${data.trend}" and current ${data.kg}kg/month, forecast next quarter's emissions. State it's a projection, not measured.`,
  };

  try {
    const res = await fetch(`${RUNTPE_API}/agents/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        agent_id: "climate-analyst",
        task: prompts[task] || prompts.audit,
        max_tokens: 300,
        temperature: 0.3,
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { result?: string };
    return body.result?.trim() || null;
  } catch {
    return null;
  }
}