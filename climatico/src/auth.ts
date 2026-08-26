import type { Principal, Scope } from "./types";
import { SCOPES } from "./types";

const encoder = new TextEncoder();

export type CredentialGrant = {
  subject?: string;
  scopes?: string[];
  ttlSeconds?: number;
};

type TokenPayload = {
  id: string;
  sub: string;
  scopes: Scope[];
  iat: number;
  exp: number;
  maxAmountCents: number;
};

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function sign(secret: string, data: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return b64url(sig);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function timingSafeEqualString(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const aa = new Uint8Array(ha);
  const bb = new Uint8Array(hb);
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

function parseScopes(input: string[] | undefined): Scope[] {
  const requested = (input ?? ["climatico:transact"]).filter((s): s is Scope =>
    (SCOPES as readonly string[]).includes(s),
  );
  const unique = [...new Set(requested)];
  if (!unique.includes("climatico:read")) unique.unshift("climatico:read");
  return unique;
}

export async function mintToken(
  secret: string,
  grant: CredentialGrant,
): Promise<{ token: string; principal: Principal; tokenHash: string }> {
  const now = Math.floor(Date.now() / 1000);
  const ttl = Math.min(Math.max(grant.ttlSeconds ?? 3600, 60), 86_400);
  const scopes = parseScopes(grant.scopes);
  const maxAmountCents = scopes.includes("climatico:admin") ? 100_000 : 5_000;
  const payload: TokenPayload = {
    id: crypto.randomUUID(),
    sub: (grant.subject ?? "anonymous-agent").slice(0, 120) || "anonymous-agent",
    scopes,
    iat: now,
    exp: now + ttl,
    maxAmountCents,
  };
  const body = b64url(encoder.encode(JSON.stringify(payload)));
  const sig = await sign(secret, `${payload.id}.${body}`);
  const token = `clima.${payload.id}.${body}.${sig}`;
  return {
    token,
    tokenHash: await sha256Hex(token),
    principal: {
      tokenId: payload.id,
      subject: payload.sub,
      scopes: payload.scopes,
      maxAmountCents: payload.maxAmountCents,
      expiresAt: payload.exp,
    },
  };
}

export async function verifyToken(
  secret: string,
  token: string,
): Promise<Principal | null> {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "clima") return null;
  const [, id, body, sig] = parts;
  const expected = await sign(secret, `${id}.${body}`);
  if (!(await timingSafeEqualString(sig, expected))) return null;
  let payload: TokenPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as TokenPayload;
  } catch {
    return null;
  }
  if (payload.id !== id) return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
  return {
    tokenId: payload.id,
    subject: payload.sub,
    scopes: payload.scopes,
    maxAmountCents: payload.maxAmountCents,
    expiresAt: payload.exp,
  };
}

export function bearerFrom(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (!header) return null;
  const [scheme, value] = header.split(" ");
  if (!scheme || !value) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  return value.trim() || null;
}

export function hasScope(principal: Principal, scope: Scope): boolean {
  return principal.scopes.includes("climatico:admin") || principal.scopes.includes(scope);
}

export { sha256Hex };
