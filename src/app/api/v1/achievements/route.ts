import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer } from "@/lib/api/v1/auth-guard";

/**
 * GET /api/v1/achievements
 *
 * The current user's earned badges. The full per-rider achievement list lives
 * on the web (kept there until the data shape stabilises across the per-ride
 * Ace/Conqueror badges); this is just the user's own collection for the
 * mobile profile screen.
 */
export async function GET(req: NextRequest) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");

  const earned = await prisma.userBadge.findMany({
    where: { userId: auth.user.id },
    include: { badge: true },
    orderBy: { earnedDate: "desc" },
  });

  return apiOk({
    badges: earned.map((eb) => ({
      id: eb.id,
      earnedDate: eb.earnedDate.toISOString(),
      tier: eb.badge.tier,
      kind: eb.badge.kind,
      name: eb.badge.name,
      description: eb.badge.description,
      icon: eb.badge.icon,
      color: eb.badge.color,
      minKm: eb.badge.minKm,
    })),
  });
}
