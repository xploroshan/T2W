// Rate limiter shared by middleware and individual route handlers.
//
// Backed by Vercel KV when KV_REST_API_URL is set, otherwise falls back to
// a per-instance in-memory Map. KV gives us limits that hold across
// Lambda cold starts and across instances; the in-memory fallback keeps
// local development working without provisioning a KV store.
//
// Implementation detail: each window is a single KV key
//   ratelimit:{type}:{ip}:{windowStart}
// holding an integer count. INCR is atomic, and EXPIRE bounds the key's
// lifetime to the window length — no manual cleanup needed.

import { kv } from "@vercel/kv";

export type RateLimitType = "auth" | "api" | "general" | "contact";

interface Limit {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Max requests permitted in a single window. */
  max: number;
}

export const RATE_LIMITS: Record<RateLimitType, Limit> = {
  auth:    { windowMs: 60_000,        max: 5   }, // login / register / OTP — was 10/min
  api:     { windowMs: 60_000,        max: 60  },
  general: { windowMs: 60_000,        max: 300 },
  contact: { windowMs: 60 * 60_000,   max: 3   }, // 3 messages per hour per IP
};

// ── In-memory fallback (works without KV; resets on cold start) ──────────
const _memMap = new Map<string, { count: number; resetAt: number }>();
let _lastPrune = Date.now();
function pruneMem() {
  const now = Date.now();
  if (now - _lastPrune < 120_000) return;
  _lastPrune = now;
  for (const [k, v] of _memMap) if (now > v.resetAt) _memMap.delete(k);
}

function checkInMemory(key: string, limit: Limit): boolean {
  pruneMem();
  const now = Date.now();
  const entry = _memMap.get(key);
  if (!entry || now > entry.resetAt) {
    _memMap.set(key, { count: 1, resetAt: now + limit.windowMs });
    return false;
  }
  if (entry.count >= limit.max) return true;
  entry.count++;
  return false;
}

// ── Mode detection — read at call time so test mocks can flip it ─────────
function hasKv(): boolean {
  return Boolean(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  );
}

/**
 * Returns true when the IP has exceeded its allowance for this window.
 * Soft-fails open on any KV error so a transient outage doesn't lock
 * legitimate users out.
 */
export async function checkRate(
  ip: string,
  type: RateLimitType
): Promise<boolean> {
  const limit = RATE_LIMITS[type];
  if (!hasKv()) {
    return checkInMemory(`${type}:${ip}`, limit);
  }

  // Bucket key includes the floor-of-window so the key naturally rolls
  // over without a separate reset op.
  const bucket = Math.floor(Date.now() / limit.windowMs);
  const key = `rl:${type}:${ip}:${bucket}`;
  try {
    const count = await kv.incr(key);
    if (count === 1) {
      // First hit in this bucket — set TTL so old keys vanish on their own.
      await kv.expire(key, Math.ceil(limit.windowMs / 1000));
    }
    return count > limit.max;
  } catch (err) {
    // KV unreachable / quota hit — fail open and log so the operator can
    // see why limits stopped being enforced.
    console.error("[T2W] rate-limit KV error, failing open:", err);
    return false;
  }
}

/** Synchronous variant for the middleware (Edge runtime, can't await). */
export function checkRateSync(ip: string, type: RateLimitType): boolean {
  // Middleware runs on every request — we keep it sync + in-memory only,
  // and reserve the KV-backed async path for route handlers that opt in
  // (auth + contact). Future work: migrate middleware to async once we
  // measure the added latency under real traffic.
  return checkInMemory(`${type}:${ip}`, RATE_LIMITS[type]);
}
