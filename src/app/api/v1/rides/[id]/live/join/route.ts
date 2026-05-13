import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer } from "@/lib/api/v1/auth-guard";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");

  const { id: rideId } = await params;
  const session = await prisma.liveRideSession.findUnique({ where: { rideId } });

  if (!session) return apiError("NOT_FOUND", "No live session for this ride");
  if (session.status === "ended") return apiError("CONFLICT", "Session has ended");

  return apiOk({
    session: {
      id: session.id,
      rideId: session.rideId,
      status: session.status,
      startedAt: session.startedAt?.toISOString() ?? null,
      leadRiderId: session.leadRiderId,
      sweepRiderId: session.sweepRiderId,
    },
    isLead: auth.user.id === session.leadRiderId,
    isSweep: auth.user.id === session.sweepRiderId,
  });
}
