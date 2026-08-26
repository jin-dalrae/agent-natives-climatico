import type { Handoff } from "./types";

/** Optional POST of each handoff as a Cotal-shaped channel message. */
export async function announceHandoff(env: Env, handoff: Handoff): Promise<void> {
  const url = (env as Env & { COTAL_WEBHOOK_URL?: string }).COTAL_WEBHOOK_URL?.trim();
  if (!url) return;
  const message = {
    channel: handoff.channel,
    from: handoff.from,
    to: handoff.to,
    kind: "channel",
    text: `${handoff.from} → ${handoff.to} · ${handoff.kind}`,
    data: handoff,
    createdAt: handoff.createdAt,
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    if (!res.ok) {
      console.error(JSON.stringify({ message: "cotal webhook failed", status: res.status }));
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "cotal webhook error",
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
  }
}
