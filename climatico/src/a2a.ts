import { hasScope } from "./auth";
import { json, unauthorized } from "./http";
import { getLedger } from "./ledger";
import type { Principal } from "./types";

type JsonRpc = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: {
    message?: {
      messageId?: string;
      role?: string;
      parts?: Array<{ text?: string; data?: Record<string, unknown> }>;
    };
  };
};

export async function handleA2A(
  request: Request,
  env: Env,
  principal: Principal | null,
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...json(request, {}).headers } });
  }
  if (request.method !== "POST") {
    return json(request, { error: "method_not_allowed" }, 405);
  }
  if (!principal) {
    return unauthorized(request, "A2A tasks require a Climatico bearer token.");
  }

  let rpc: JsonRpc;
  try {
    rpc = (await request.json()) as JsonRpc;
  } catch {
    return json(request, rpcError(null, -32700, "Parse error"), 400);
  }

  const method = rpc.method ?? "";
  if (method !== "SendMessage" && method !== "message/send") {
    return json(request, rpcError(rpc.id ?? null, -32601, `Unsupported method ${method}`));
  }

  const parts = rpc.params?.message?.parts ?? [];
  const dataPart = parts.find((part) => part.data)?.data;
  const text = parts.map((part) => part.text ?? "").join(" ").trim();
  const parsed = dataPart
    ? {
        intent: String(dataPart.intent ?? ""),
        location: String(dataPart.location ?? ""),
        amountCents: typeof dataPart.amountCents === "number" ? dataPart.amountCents : undefined,
        source: typeof dataPart.source === "string" ? dataPart.source : undefined,
        note: typeof dataPart.note === "string" ? dataPart.note : text,
      }
    : parseText(text);

  if (!hasScope(principal, "climatico:transact")) {
    return json(
      request,
      rpcResult(rpc.id ?? null, {
        refused: true,
        code: "missing_scope",
        reason: "Mint climatico:transact to send tasks.",
      }),
    );
  }

  const ledger = await getLedger(env);
  const receipt = await ledger.runAction(parsed, principal);
  return json(request, rpcResult(rpc.id ?? null, { receipt }));
}

function parseText(text: string): {
  intent: string;
  location: string;
  amountCents?: number;
  source?: string;
  note?: string;
} {
  const lower = text.toLowerCase();
  let intent = "brief";
  if (/\boffset\b/.test(lower)) intent = "offset";
  else if (/\babate\b/.test(lower)) intent = "abate";
  else if (/\bwatch\b/.test(lower)) intent = "watch";
  else if (/\bassess\b/.test(lower)) intent = "assess";
  else if (/\bbrief\b/.test(lower)) intent = "brief";
  const sourceMatch = text.match(/\b(logistics|compute|electricity|travel|hardware|saas|direct)\b/i);
  const amountMatch = text.match(/\$(\d+(?:\.\d{1,2})?)/);
  const amountCents = amountMatch ? Math.round(Number(amountMatch[1]) * 100) : undefined;
  const locationMatch =
    text.match(/\b(?:for|on|in|at)\s+(.+)$/i) || text.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\b/);
  const location = locationMatch?.[1]?.replace(/[.?!]$/, "").trim() ?? "";
  return { intent, location, amountCents, source: sourceMatch?.[1].toLowerCase(), note: text };
}

function rpcResult(id: string | number | null, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}
