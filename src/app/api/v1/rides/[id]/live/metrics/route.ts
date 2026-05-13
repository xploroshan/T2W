import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { pathDistanceKm } from "@/lib/geo-utils";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer } from "@/lib/api/v1/auth-guard";

/**
 * GET /api/v1/rides/:id/live/metrics
 *
 * Lightweight in-ride metrics for the mobile "live" screen — group totals
 * for the lead rider plus the requesting rider's own card. The full
 * post-ride summary (smoothed distance, elevation, overrides, splits) lives
 * on the web for now; we expose it under v1 once that surface stabilises.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");

  const { id: rideId } = await params;
  const session = await prisma.liveRideSession.findUnique({
    where: { rideId },
    include: { breaks: true },
  });
  if (!session) return apiError("NOT_FOUND", "No session");

  const start = session.startedAt ?? session.createdAt;
  const end = session.endedAt ?? new Date();
  const elapsedMs = Math.max(0, end.getTime() - start.getTime());
  const elapsedMinutes = Math.round(elapsedMs / 60_000);

  let breakMs = 0;
  let closedBreakCount = 0;
  for (const b of session.breaks) {
    if (!b.endedAt) continue;
    breakMs += b.endedAt.getTime() - b.startedAt.getTime();
    closedBreakCount += 1;
  }
  const breakMinutes = Math.round(breakMs / 60_000);
  const movingMinutes = Math.max(0, elapsedMinutes - breakMinutes);

  const [leadPath, mePath, leadSpeed, meSpeed, riderRows] = await Promise.all([
    session.leadRiderId
      ? prisma.liveRideLocation.findMany({
          where: { sessionId: session.id, userId: session.leadRiderId },
          orderBy: { recordedAt: "asc" },
          select: { lat: true, lng: true },
        })
      : Promise.resolve([]),
    prisma.liveRideLocation.findMany({
      where: { sessionId: session.id, userId: auth.user.id },
      orderBy: { recordedAt: "asc" },
      select: { lat: true, lng: true },
    }),
    prisma.liveRideLocation.aggregate({
      where: { sessionId: session.id, speed: { not: null, gt: 0, lte: 220 } },
      _avg: { speed: true },
      _max: { speed: true },
    }),
    prisma.liveRideLocation.aggregate({
      where: {
        sessionId: session.id,
        userId: auth.user.id,
        speed: { not: null, gt: 0, lte: 220 },
      },
      _avg: { speed: true },
      _max: { speed: true },
    }),
    prisma.liveRideLocation.findMany({
      where: { sessionId: session.id },
      distinct: ["userId"],
      select: { userId: true },
    }),
  ]);

  const round1 = (n: number) => Math.round(n * 10) / 10;
  const distanceKm = leadPath.length > 1 ? round1(pathDistanceKm(leadPath)) : 0;
  const meDistanceKm = mePath.length > 1 ? round1(pathDistanceKm(mePath)) : 0;

  return apiOk({
    session: {
      status: session.status,
      startedAt: session.startedAt?.toISOString() ?? null,
      endedAt: session.endedAt?.toISOString() ?? null,
    },
    group: {
      distanceKm,
      elapsedMinutes,
      movingMinutes,
      breakMinutes,
      closedBreaks: closedBreakCount,
      activeBreak: session.breaks.find((b) => !b.endedAt) ? true : false,
      avgSpeedKmh: round1(leadSpeed._avg.speed ?? 0),
      maxSpeedKmh: round1(leadSpeed._max.speed ?? 0),
      riderCount: riderRows.length,
    },
    me: {
      distanceKm: meDistanceKm,
      movingMinutes: mePath.length > 1 ? movingMinutes : 0,
      avgSpeedKmh: round1(meSpeed._avg.speed ?? 0),
      maxSpeedKmh: round1(meSpeed._max.speed ?? 0),
      hasPath: mePath.length > 1,
    },
  });
}
