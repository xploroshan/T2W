import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer, isAdminRole } from "@/lib/api/v1/auth-guard";

/**
 * POST /api/v1/rides/:id/live/break
 *
 * Body: { action: "start" | "end", reason?: string }
 *
 * Admin (superadmin / core_member with canControlLiveTracking) only. Mirrors
 * the web break controller: opens an exclusive break, pauses the session
 * during the break, and transactionally closes the break to avoid races.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");

  if (!isAdminRole(auth.user.role)) {
    return apiError("FORBIDDEN", "Only core members and super admins can control breaks");
  }
  if (auth.user.role === "core_member") {
    const { getRolePermissions } = await import("@/lib/role-permissions");
    const perms = await getRolePermissions();
    if (!perms.core_member.canControlLiveTracking) {
      return apiError(
        "FORBIDDEN",
        "Core members do not have permission to control live tracking",
      );
    }
  }

  const { id: rideId } = await params;
  const { action, reason } = (await req.json()) as {
    action?: "start" | "end";
    reason?: string;
  };

  const session = await prisma.liveRideSession.findUnique({ where: { rideId } });
  if (!session || (session.status !== "live" && session.status !== "paused")) {
    return apiError("CONFLICT", "No active session");
  }

  if (action === "start") {
    const open = await prisma.liveRideBreak.findFirst({
      where: { sessionId: session.id, endedAt: null },
    });
    if (open) return apiError("CONFLICT", "A break is already active");

    const created = await prisma.liveRideBreak.create({
      data: { sessionId: session.id, reason: reason?.trim() || null },
    });
    await prisma.liveRideSession.update({
      where: { id: session.id },
      data: { status: "paused" },
    });

    return apiOk({
      break: {
        id: created.id,
        startedAt: created.startedAt.toISOString(),
        endedAt: null,
        reason: created.reason,
      },
    });
  }

  if (action === "end") {
    const result = await prisma.$transaction(async (tx) => {
      const open = await tx.liveRideBreak.findFirst({
        where: { sessionId: session.id, endedAt: null },
        orderBy: { startedAt: "desc" },
      });
      if (!open) return { error: "NO_OPEN_BREAK" as const };

      const closed = await tx.liveRideBreak.updateMany({
        where: { id: open.id, endedAt: null },
        data: { endedAt: new Date() },
      });
      if (closed.count === 0) return { error: "NO_OPEN_BREAK" as const };

      const updated = await tx.liveRideBreak.findUnique({ where: { id: open.id } });
      const stillOpen = await tx.liveRideBreak.findFirst({
        where: { sessionId: session.id, endedAt: null },
      });
      if (!stillOpen) {
        await tx.liveRideSession.update({
          where: { id: session.id },
          data: { status: "live" },
        });
      }
      return { updated };
    });

    if ("error" in result) {
      return apiError("CONFLICT", "No active break to end");
    }
    const u = result.updated!;
    return apiOk({
      break: {
        id: u.id,
        startedAt: u.startedAt.toISOString(),
        endedAt: u.endedAt?.toISOString() ?? null,
        reason: u.reason,
      },
    });
  }

  return apiError("BAD_REQUEST", "action must be 'start' or 'end'");
}
