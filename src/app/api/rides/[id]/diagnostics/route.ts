import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/rides/[id]/diagnostics
//
// Super-admin endpoint that crunches per-rider interval statistics on
// LiveRideLocation rows. Used by /admin/ride-diagnostics to verify the
// offline-GPS replay path worked correctly — see
// docs/runbooks/offline-gps-test.md.

// Histogram buckets (seconds). The last bucket catches everything from
// 5 min upwards.
const HISTOGRAM_BUCKETS = [5, 15, 60, 300];
const SUSPICIOUS_BUNCHED_MS = 100;
const LONG_GAP_S = 300;

interface RiderDiagnostics {
  userId: string;
  userName: string;
  totalPoints: number;
  medianIntervalS: number;
  p95IntervalS: number;
  histogram: number[]; // counts per bucket: <5s, 5-15s, 15-60s, 60-300s, 300s+
  longGaps: { startAt: string; endAt: string; gapSeconds: number }[];
  suspiciousBunchCount: number;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Super-admin only. Diagnostics expose per-rider timestamps which we
  // don't want every core member to see by default.
  if (user.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: rideId } = await params;
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: { liveSession: { select: { id: true } } },
  });
  if (!ride?.liveSession) {
    return NextResponse.json({ error: "No live session" }, { status: 404 });
  }

  const points = await prisma.liveRideLocation.findMany({
    where: { sessionId: ride.liveSession.id },
    orderBy: { recordedAt: "asc" },
    select: { userId: true, recordedAt: true },
  });

  // Map userId → display name. Resolve in one trip.
  const userIds = Array.from(new Set(points.map((p) => p.userId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const userName = new Map(users.map((u) => [u.id, u.name]));

  const riders: RiderDiagnostics[] = userIds.map((uid) => {
    const userPoints = points.filter((p) => p.userId === uid);
    return computeRiderDiagnostics(uid, userName.get(uid) ?? uid, userPoints);
  });

  // Sort by name for stable admin display.
  riders.sort((a, b) => a.userName.localeCompare(b.userName));

  return NextResponse.json({
    rideId,
    sessionId: ride.liveSession.id,
    totalPoints: points.length,
    riders,
    bucketLabels: bucketLabels(),
  });
}

/** Exported for unit testing. */
export function computeRiderDiagnostics(
  userId: string,
  userName: string,
  points: { recordedAt: Date }[]
): RiderDiagnostics {
  if (points.length === 0) {
    return {
      userId,
      userName,
      totalPoints: 0,
      medianIntervalS: 0,
      p95IntervalS: 0,
      histogram: HISTOGRAM_BUCKETS.map(() => 0).concat([0]),
      longGaps: [],
      suspiciousBunchCount: 0,
    };
  }

  const intervals: number[] = [];
  const longGaps: { startAt: string; endAt: string; gapSeconds: number }[] = [];
  let suspicious = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].recordedAt.getTime();
    const cur = points[i].recordedAt.getTime();
    const deltaMs = cur - prev;
    intervals.push(deltaMs / 1000);
    if (deltaMs >= 0 && deltaMs < SUSPICIOUS_BUNCHED_MS) suspicious++;
    if (deltaMs / 1000 >= LONG_GAP_S) {
      longGaps.push({
        startAt: points[i - 1].recordedAt.toISOString(),
        endAt: points[i].recordedAt.toISOString(),
        gapSeconds: deltaMs / 1000,
      });
    }
  }

  const median = percentile(intervals, 50);
  const p95 = percentile(intervals, 95);
  const histogram = bucketize(intervals);

  return {
    userId,
    userName,
    totalPoints: points.length,
    medianIntervalS: Math.round(median * 100) / 100,
    p95IntervalS: Math.round(p95 * 100) / 100,
    histogram,
    longGaps,
    suspiciousBunchCount: suspicious,
  };
}

function bucketize(intervalsS: number[]): number[] {
  // Buckets: <5, 5-15, 15-60, 60-300, 300+
  const counts = new Array(HISTOGRAM_BUCKETS.length + 1).fill(0);
  for (const s of intervalsS) {
    let placed = false;
    for (let i = 0; i < HISTOGRAM_BUCKETS.length; i++) {
      if (s < HISTOGRAM_BUCKETS[i]) {
        counts[i]++;
        placed = true;
        break;
      }
    }
    if (!placed) counts[counts.length - 1]++;
  }
  return counts;
}

function bucketLabels(): string[] {
  return ["<5s", "5–15s", "15–60s", "1–5min", "5min+"];
}

function percentile(values: number[], pct: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((pct / 100) * sorted.length));
  return sorted[idx];
}
