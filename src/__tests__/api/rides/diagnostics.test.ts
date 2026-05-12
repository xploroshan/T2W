import { describe, it, expect, vi, beforeEach } from "vitest";
import { createNextRequest, parseResponse, mockSuperAdmin, mockRider } from "@/__tests__/helpers";

vi.mock("@/lib/db", () => ({
  prisma: {
    ride: { findUnique: vi.fn() },
    liveRideLocation: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));

import { GET, computeRiderDiagnostics } from "@/app/api/rides/[id]/diagnostics/route";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const makeParams = () => ({ params: Promise.resolve({ id: "ride-1" }) });

describe("computeRiderDiagnostics — pure bucketing", () => {
  const t0 = new Date("2025-01-01T00:00:00.000Z").getTime();
  const at = (offsetS: number) => ({ recordedAt: new Date(t0 + offsetS * 1000) });

  it("returns zeros on an empty input", () => {
    const d = computeRiderDiagnostics("u", "User", []);
    expect(d.totalPoints).toBe(0);
    expect(d.medianIntervalS).toBe(0);
    expect(d.histogram).toEqual([0, 0, 0, 0, 0]);
  });

  it("buckets 5 s intervals into the <5s bucket only when strictly less than 5", () => {
    // Six points 4 s apart — five intervals at 4.0s each.
    const pts = Array.from({ length: 6 }, (_, i) => at(i * 4));
    const d = computeRiderDiagnostics("u", "User", pts);
    expect(d.histogram).toEqual([5, 0, 0, 0, 0]);
  });

  it("places 5-second intervals into the 5–15s bucket (boundary behavior)", () => {
    const pts = [at(0), at(5), at(10), at(15)];
    // intervals: 5, 5, 5 — all should land in the 5-15s bucket.
    const d = computeRiderDiagnostics("u", "User", pts);
    expect(d.histogram[1]).toBe(3);
  });

  it("flags intervals > 5 min as longGaps", () => {
    // 1 long gap (600s = 10 min) flanked by normal pings.
    const pts = [at(0), at(5), at(605), at(610)];
    const d = computeRiderDiagnostics("u", "User", pts);
    expect(d.longGaps.length).toBe(1);
    expect(d.longGaps[0].gapSeconds).toBe(600);
  });

  it("counts intervals < 100 ms as suspicious chronology (timestamp-bunching regression)", () => {
    // Two pings stamped 50 ms apart, then a normal gap.
    const pts = [
      { recordedAt: new Date(t0) },
      { recordedAt: new Date(t0 + 50) },
      { recordedAt: new Date(t0 + 5000) },
    ];
    const d = computeRiderDiagnostics("u", "User", pts);
    expect(d.suspiciousBunchCount).toBe(1);
  });

  it("computes median + p95 correctly", () => {
    // intervals (s): 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
    const pts = [at(0), at(1), at(3), at(6), at(10), at(15), at(21), at(28), at(36), at(45), at(55)];
    const d = computeRiderDiagnostics("u", "User", pts);
    // 10 intervals: median ~5, p95 ~10
    expect(d.medianIntervalS).toBeGreaterThanOrEqual(5);
    expect(d.p95IntervalS).toBeGreaterThanOrEqual(9);
  });
});

describe("GET /api/rides/:id/diagnostics — auth + happy path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const res = await GET(createNextRequest("http://localhost:3000/api/rides/ride-1/diagnostics"), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular rider", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockRider as any);
    const res = await GET(createNextRequest("http://localhost:3000/api/rides/ride-1/diagnostics"), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 404 when the ride has no live session", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockSuperAdmin as any);
    vi.mocked(prisma.ride.findUnique).mockResolvedValue({ liveSession: null } as any);
    const res = await GET(createNextRequest("http://localhost:3000/api/rides/ride-1/diagnostics"), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns per-rider diagnostics when the ride has points", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockSuperAdmin as any);
    vi.mocked(prisma.ride.findUnique).mockResolvedValue({
      liveSession: { id: "sess-1" },
    } as any);
    vi.mocked(prisma.liveRideLocation.findMany).mockResolvedValue([
      { userId: "u1", recordedAt: new Date("2025-01-01T00:00:00Z") },
      { userId: "u1", recordedAt: new Date("2025-01-01T00:00:05Z") },
      { userId: "u2", recordedAt: new Date("2025-01-01T00:00:00Z") },
      { userId: "u2", recordedAt: new Date("2025-01-01T00:00:05Z") },
    ] as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "u1", name: "Alice" },
      { id: "u2", name: "Bob" },
    ] as any);

    const res = await GET(createNextRequest("http://localhost:3000/api/rides/ride-1/diagnostics"), makeParams());
    const { status, data } = await parseResponse(res);
    expect(status).toBe(200);
    expect(data.riders).toHaveLength(2);
    expect(data.riders[0].userName).toBe("Alice"); // sorted alphabetically
    expect(data.bucketLabels).toEqual(["<5s", "5–15s", "15–60s", "1–5min", "5min+"]);
  });
});
