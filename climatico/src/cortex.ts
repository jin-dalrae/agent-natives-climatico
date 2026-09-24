const localMemoryStore = new Map<string, Array<{ content: string; timestamp: number }>>();

const CORTEX_WRITE = "https://api.mitosislabs.ai/v1/cortex/remember";
const CORTEX_READ = "https://api.mitosislabs.ai/v1/cortex/recall";

type CortexResponse = {
  ok: boolean;
  memory_id?: string;
  results?: Array<{ content: string; timestamp: number; metadata?: Record<string, unknown> }>;
};

export async function cortexRemember(
  env: Env,
  namespace: string,
  content: string,
  metadata?: Record<string, unknown>,
): Promise<string | null> {
  const memoryId = `mem_${crypto.randomUUID().slice(0, 12)}`;
  const item = { content, timestamp: Date.now() };

  const list = localMemoryStore.get(namespace) || [];
  list.unshift(item);
  if (list.length > 50) list.pop();
  localMemoryStore.set(namespace, list);

  const key = (env as Env & { MITOSIS_API_KEY?: string }).MITOSIS_API_KEY?.trim();
  if (!key) return memoryId;

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
    return body.memory_id || memoryId;
  } catch {
    return memoryId;
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
  if (!key) {
    const list = localMemoryStore.get(namespace) || [];
    return list.slice(0, limit);
  }

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
    if (!res.ok) return (localMemoryStore.get(namespace) || []).slice(0, limit);
    const body = (await res.json()) as CortexResponse;
    if (!body.results?.length) {
      return (localMemoryStore.get(namespace) || []).slice(0, limit);
    }
    return (body.results || []).map((r) => ({
      content: r.content,
      timestamp: r.timestamp,
    }));
  } catch {
    return (localMemoryStore.get(namespace) || []).slice(0, limit);
  }
}
