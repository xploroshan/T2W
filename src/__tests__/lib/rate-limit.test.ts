import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// vi.mock is hoisted, so the factory cannot close over outer-scope vars.
// We define spies *inside* the factory and recover them after the import.
vi.mock("@vercel/kv", () => ({
  kv: { incr: vi.fn(), expire: vi.fn() },
}));

import { checkRate, checkRateSync, RATE_LIMITS } from "@/lib/rate-limit";
import { kv } from "@vercel/kv";

const kvIncr = kv.incr as ReturnType<typeof vi.fn>;
const kvExpire = kv.expire as ReturnType<typeof vi.fn>;

describe("checkRate (KV-backed)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.KV_REST_API_URL = "https://kv.example";
    process.env.KV_REST_API_TOKEN = "test-token";
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns false on the first hit and sets a TTL", async () => {
    kvIncr.mockResolvedValue(1);
    const limited = await checkRate("1.2.3.4", "auth");
    expect(limited).toBe(false);
    expect(kvIncr).toHaveBeenCalledOnce();
    expect(kvExpire).toHaveBeenCalledOnce();
  });

  it("does not set TTL after the first hit", async () => {
    kvIncr.mockResolvedValue(2);
    const limited = await checkRate("1.2.3.4", "auth");
    expect(limited).toBe(false);
    expect(kvIncr).toHaveBeenCalledOnce();
    expect(kvExpire).not.toHaveBeenCalled();
  });

  it("returns true once the count exceeds the auth limit", async () => {
    kvIncr.mockResolvedValue(RATE_LIMITS.auth.max + 1);
    const limited = await checkRate("1.2.3.4", "auth");
    expect(limited).toBe(true);
  });

  it("fails open on KV errors so a transient outage doesn't lock users out", async () => {
    kvIncr.mockRejectedValue(new Error("KV unreachable"));
    const limited = await checkRate("1.2.3.4", "auth");
    expect(limited).toBe(false);
  });

  it("falls back to in-memory when KV env vars are not set", async () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    const limited = await checkRate("9.9.9.9", "auth");
    expect(limited).toBe(false);
    // KV should NOT have been called.
    expect(kvIncr).not.toHaveBeenCalled();
  });
});

describe("checkRateSync (in-memory only, for middleware)", () => {
  it("permits requests under the api limit", () => {
    for (let i = 0; i < RATE_LIMITS.api.max; i++) {
      expect(checkRateSync("5.5.5.5", "api")).toBe(false);
    }
  });

  it("rate-limits a flood once the api budget is exhausted", () => {
    const ip = "6.6.6.6";
    for (let i = 0; i < RATE_LIMITS.api.max; i++) checkRateSync(ip, "api");
    expect(checkRateSync(ip, "api")).toBe(true);
  });

  it("buckets by IP — one IP's flood does not affect another", () => {
    for (let i = 0; i < RATE_LIMITS.api.max; i++) checkRateSync("7.7.7.7", "api");
    expect(checkRateSync("8.8.8.8", "api")).toBe(false);
  });

  it("auth window is much tighter than the general api window", () => {
    expect(RATE_LIMITS.auth.max).toBeLessThan(RATE_LIMITS.api.max);
  });
});
