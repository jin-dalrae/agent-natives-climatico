import type { EvidenceItem } from "./types";

const CORTEX_WRITE = "https://api.mitosislabs.ai/v1/cortex/remember";
const CORTEX_READ = "https://api.mitosislabs.ai/v1/cortex/recall";

type CortexResponse = {
  ok: boolean;
  memory_id?: string;
  results?: Array<{ content: string; timestamp: number; metadata?: Record<string, unknown> }>;
};

/**
 * Stores a fact in Cortex (Mitosis Labs) persistent memory. Each memory
 * has a universal_id and a namespace. Returns the memory_id or null.
 */
export async function cortexRemember(
  env: Env,
  namespace: string,
  content: string,
  metadata?: Record<string, unknown>,
): Promise<string | null> {
  const key = (env as Env & { MITOSIS_API_KEY?: string }).MITOSIS_API_KEY?.trim();
  if (!key) return null;

  try {
    const res = await fetch(CORTEX_WRITE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        namespace: `climatico:${namespace}`,
        content,
        metadata: { source: "climatico", ...metadata },
        ttl_days: 90,
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as CortexResponse;
    return body.memory_id || null;
  } catch {
    return null;
  }
}

/**
 * Recalls recent memories from Cortex for a given namespace.
 * Returns up to 5 most recent entries.
 */
export async function cortexRecall(
  env: Env,
  namespace: string,
  limit = 5,
): Promise<Array<{ content: string; timestamp: number }>> {
  const key = (env as Env & { MITOSIS_API_KEY?: string }).MITOSIS_API_KEY?.trim();
  if (!key) return [];

  try {
    const res = await fetch(CORTEX_READ, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        namespace: `climatico:${namespace}`,
        limit,
        order: "desc",
      }),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as CortexResponse;
    return (body.results || []).map((r) => ({
      content: r.content,
      timestamp: r.timestamp,
    }));
  } catch {
    return [];
  }
}