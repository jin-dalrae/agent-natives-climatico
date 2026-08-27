import { TenkiSandbox } from "@tenkicloud/sandbox";
import { createConnectTransport } from "@connectrpc/connect-web";
import type { Interceptor } from "@connectrpc/connect";

const TENKI_BASE_URL = "https://api.tenki.cloud";

/**
 * Tenki's SDK defaults to a Node-only gRPC/http2 transport, which does not exist in
 * workerd. Control-plane calls (create/get/list/whoAmI/updateSession) are unary, so a
 * fetch-based Connect transport works for those. exec() is bidirectional streaming and
 * cannot run from a Worker under any transport — that half of the round trip happens
 * outside, and reports back via POST /v1/sandbox/complete.
 */
function authInterceptor(token: string): Interceptor {
  return (next) => async (req) => {
    req.header.set("Authorization", `Bearer ${token}`);
    return next(req);
  };
}

/** connect-web sets redirect:"error" by default; workerd's fetch only supports follow/manual. */
function workersFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (init?.redirect === "error") {
    return fetch(input, { ...init, redirect: "manual" });
  }
  return fetch(input, init);
}

export function tenkiClient(env: Env): TenkiSandbox | null {
  const token = (env as Env & { TENKI_API_KEY?: string }).TENKI_API_KEY?.trim();
  if (!token) return null;
  return new TenkiSandbox({
    authToken: token,
    baseUrl: TENKI_BASE_URL,
    transport: createConnectTransport({
      baseUrl: TENKI_BASE_URL,
      interceptors: [authInterceptor(token)],
      fetch: workersFetch,
    }),
  });
}

export async function createSandboxSession(
  env: Env,
  name: string,
): Promise<{ sessionId: string } | { error: string }> {
  const client = tenkiClient(env);
  if (!client) return { error: "TENKI_API_KEY not configured" };
  try {
    const session = await client.create({ name, cpuCores: 1, memoryMb: 1024 });
    return { sessionId: session.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "tenki sandbox create failed" };
  }
}

export async function sandboxSessionState(env: Env, sessionId: string): Promise<string | null> {
  const client = tenkiClient(env);
  if (!client) return null;
  try {
    const info = await client.get(sessionId);
    return (info as { state?: string; status?: string }).state ?? (info as { status?: string }).status ?? null;
  } catch {
    return null;
  }
}
