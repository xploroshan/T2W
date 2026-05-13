import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { safeJsonParse } from "@/lib/json-utils";
import { decimatePath } from "@/lib/geo-utils";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer } from "@/lib/api/v1/auth-guard";

const MAX_PATH_POINTS = 2000;

/**
 * GET /api/v1/rides/:id/live[?since=ISO]
 *
 * Session state + latest known position per rider + the lead-rider polyline
 * and the requesting user's own polyline. The `since` cursor enables delta
 * mode so a long-running mobile session doesn't refetch the entire path on
 * every poll.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");

  const { id: rideId } = await params;
  const sinceParam = req.nextUrl.searchParams.get("since");
  const sinceDate = sinceParam ? new Date(sinceParam) : null;
  if (sinceDate && Number.isNaN(sinceDate.getTime())) {
    return apiError("BAD_REQUEST", "since must be an ISO timestamp");
  }

  const session = await prisma.liveRideSession.findUnique({
    where: { rideId },
    include: { breaks: { orderBy: { startedAt: "desc" } } },
  });

  if (!session) {
    return apiOk({ session: null, riders: [], leadPath: [], myPath: [] });
  }

  const latestLocations = await prisma.$queryRaw<
    {
      userId: string;
      lat: number;
      lng: number;
      speed: number | null;
      heading: number | null;
      isDeviated: boolean;
      recordedAt: Date;
    }[]
  >`
    SELECT DISTINCT ON ("userId")
      "userId", lat, lng, speed, heading, "isDeviated", "recordedAt"
    FROM "LiveRideLocation"
    WHERE "sessionId" = ${session.id}
    ORDER BY "userId", "recordedAt" DESC
  `;

  const userIds = latestLocations.map((l) => l.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, avatar: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const riders = latestLocations.map((loc) => {
    const u = userMap.get(loc.userId);
    return {
      userId: loc.userId,
      userName: u?.name ?? "Unknown",
      userAvatar: u?.avatar ?? null,
      lat: loc.lat,
      lng: loc.lng,
      speed: loc.speed,
      heading: loc.heading,
      isDeviated: loc.isDeviated,
      isLead: loc.userId === session.leadRiderId,
      isSweep: loc.userId === session.sweepRiderId,
      recordedAt: loc.recordedAt.toISOString(),
    };
  });

  const [leadPath, myPath] = await Promise.all([
    session.leadRiderId
      ? loadUserPath(session.id, session.leadRiderId, sinceDate)
      : Promise.resolve([]),
    session.leadRiderId === auth.user.id
      ? Promise.resolve([])
      : loadUserPath(session.id, auth.user.id, sinceDate),
  ]);

  return apiOk({
    session: {
      id: session.id,
      rideId: session.rideId,
      status: session.status,
      startedAt: session.startedAt?.toISOString() ?? null,
      endedAt: session.endedAt?.toISOString() ?? null,
      leadRiderId: session.leadRiderId,
      sweepRiderId: session.sweepRiderId,
      plannedRoute: session.plannedRoute
        ? safeJsonParse(session.plannedRoute, undefined)
        : null,
      breaks: session.breaks.map((b) => ({
        id: b.id,
        startedAt: b.startedAt.toISOString(),
        endedAt: b.endedAt?.toISOString() ?? null,
        reason: b.reason,
      })),
    },
    riders,
    leadPath,
    myPath,
  });
}

async function loadUserPath(
  sessionId: string,
  userId: string,
  sinceDate: Date | null,
) {
  if (sinceDate) {
    const newPoints = await prisma.liveRideLocation.findMany({
      where: { sessionId, userId, recordedAt: { gt: sinceDate } },
      orderBy: { recordedAt: "asc" },
      select: { lat: true, lng: true, recordedAt: true, speed: true, accuracy: true },
    });
    return newPoints.map((l) => ({
      lat: l.lat,
      lng: l.lng,
      recordedAt: l.recordedAt.toISOString(),
      speed: l.speed,
      accuracy: l.accuracy,
    }));
  }
  const all = await prisma.liveRideLocation.findMany({
    where: { sessionId, userId },
    orderBy: { recordedAt: "asc" },
    select: { lat: true, lng: true, recordedAt: true, speed: true, accuracy: true },
  });
  return decimatePath(all, MAX_PATH_POINTS).map((l) => ({
    lat: l.lat,
    lng: l.lng,
    recordedAt: l.recordedAt.toISOString(),
    speed: l.speed,
    accuracy: l.accuracy,
  }));
}
