const localSessions = new Map<string, { id: string; name: string; state: string; createdAt: number }>();

export async function createSandboxSession(
  env: Env,
  name: string,
): Promise<{ sessionId: string } | { error: string }> {
  const sessionId = `sandbox_${crypto.randomUUID().slice(0, 12)}`;
  localSessions.set(sessionId, {
    id: sessionId,
    name,
    state: "running",
    createdAt: Date.now(),
  });
  return { sessionId };
}

export async function sandboxSessionState(env: Env, sessionId: string): Promise<string | null> {
  const session = localSessions.get(sessionId);
  return session ? session.state : "completed";
}
