export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function json(
  request: Request,
  body: unknown,
  status = 200,
  extra?: HeadersInit,
): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request),
      ...extra,
    },
  });
}

export function unauthorized(request: Request, description: string): Response {
  const url = new URL(request.url);
  return json(
    request,
    {
      error: "invalid_token",
      error_description: description,
      hint: `Mint a scoped credential at POST ${url.origin}/v1/credentials then retry with Authorization: Bearer.`,
    },
    401,
    {
      "WWW-Authenticate": `Bearer realm="climatico", resource_metadata="${url.origin}/.well-known/oauth-protected-resource"`,
    },
  );
}

export function publicBase(request: Request, env: Env): string {
  const configured = env.PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export async function readJson<T>(request: Request): Promise<T | null> {
  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/json") && request.method !== "POST") {
    return null;
  }
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
