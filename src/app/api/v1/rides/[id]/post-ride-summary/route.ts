import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { pathDistanceKm } from "@/lib/geo-utils";
import { computeSplits, type TimedPoint } from "@/lib/ride-analytics";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer } from "@/lib/api/v1/auth-guard";

/**
 * GET /api/v1/rides/:id/post-ride-summary
 *
 * The post-ride view for an ended live session. Combines the smoothed
 * lead path (preferred over raw for distance), per-km splits, elevation
 * summary, and the requesting user's personal numbers.
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
  if (!session) return apiError("NOT_FOUND", "No session for this ride");

  const start = session.startedAt ?? session.createdAt;
  const end = session.endedAt ?? new Date();
  const elapsedMs = Math.max(0, end.getTime() - start.getTime());

  let breakMs = 0;
  let closedBreaks = 0;
  for (const b of session.breaks) {
    if (!b.endedAt) continue;
    breakMs += b.endedAt.getTime() - b.startedAt.getTime();
    closedBreaks += 1;
  }
  const elapsedMinutes = Math.round(elapsedMs / 60_000);
  const breakMinutes = Math.round(breakMs / 60_000);
  const movingMinutes = Math.max(0, elapsedMinutes - breakMinutes);

  const [leadPath, leadSmoothed, mePath, leadSpeed, meSpeed] = await Promise.all([
    session.leadRiderId
      ? prisma.liveRideLocation.findMany({
          where: { sessionId: session.id, userId: session.leadRiderId },
          orderBy: { recordedAt: "asc" },
          select: { lat: true, lng: true, recordedAt: true, speed: true },
        })
      : Promise.resolve([]),
    session.leadRiderId
      ? prisma.liveRideLocationSmoothed.findMany({
          where: { sessionId: session.id, userId: session.leadRiderId },
          orderBy: { sourceOrder: "asc" },
          select: { lat: true, lng: true },
        })
      : Promise.resolve([]),
    prisma.liveRideLocation.findMany({
      where: { sessionId: session.id, userId: auth.user.id },
      orderBy: { recordedAt: "asc" },
      select: { lat: true, lng: true, recordedAt: true },
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
  ]);

  const round1 = (n: number) => Math.round(n * 10) / 10;
  const distancePoints = leadSmoothed.length > 1 ? leadSmoothed : leadPath;
  const distanceKm = distancePoints.length > 1 ? round1(pathDistanceKm(distancePoints)) : 0;
  const meDistanceKm = mePath.length > 1 ? round1(pathDistanceKm(mePath)) : 0;

  // Build TimedPoints for splits using the lead's raw timestamps.
  const timedLead: TimedPoint[] = leadPath.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    recordedAt: p.recordedAt,
    speed: p.speed,
  }));

  // Elevation profile is sourced from the elevation backfill on the live
  // session. We don't have it on the smoothed/raw rows, so for v1 we omit
  // per-split elevation (and let the post-ride elevation card show null).
  const splits = timedLead.length > 1 ? computeSplits(timedLead, null, 1) : [];
  const elev = null;

  return apiOk({
    session: {
      id: session.id,
      status: session.status,
      startedAt: session.startedAt?.toISOString() ?? null,
      endedAt: session.endedAt?.toISOString() ?? null,
    },
    group: {
      distanceKm,
      elapsedMinutes,
      movingMinutes,
      breakMinutes,
      closedBreaks,
      avgSpeedKmh: round1(leadSpeed._avg.speed ?? 0),
      maxSpeedKmh: round1(leadSpeed._max.speed ?? 0),
    },
    me: {
      distanceKm: meDistanceKm,
      avgSpeedKmh: round1(meSpeed._avg.speed ?? 0),
      maxSpeedKmh: round1(meSpeed._max.speed ?? 0),
      hasPath: mePath.length > 1,
    },
    splits: splits.map((s) => ({
      index: s.index,
      distanceKm: round1(s.distanceKm),
      durationSec: s.durationSec,
      avgSpeedKmh: round1(s.avgSpeedKmh),
      elevGainM: s.elevGainM,
      elevLossM: s.elevLossM,
    })),
    elevation: elev,
  });
}
