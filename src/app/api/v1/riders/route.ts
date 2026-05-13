import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer, isAdminRole } from "@/lib/api/v1/auth-guard";

function periodCutoffDate(period: string | null): Date | null {
  if (!period || period === "all") return null;
  const now = new Date();
  if (period === "6m") {
    now.setMonth(now.getMonth() - 6);
    return now;
  }
  if (period === "1y") {
    now.setFullYear(now.getFullYear() - 1);
    return now;
  }
  return null;
}

/**
 * GET /api/v1/riders?period=6m|1y|all&search=name
 *
 * Leaderboard view. PII (email/phone/emergency contacts) is only included
 * for super admins and core members.
 */
export async function GET(req: NextRequest) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");

  const isPrivileged = isAdminRole(auth.user.role);
  const search = req.nextUrl.searchParams.get("search") ?? "";
  const period = req.nextUrl.searchParams.get("period");
  const cutoff = periodCutoffDate(period);

  const where: Record<string, unknown> = { mergedIntoId: null };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const profiles = await prisma.riderProfile.findMany({
    where,
    include: {
      participations: {
        where: {
          droppedOut: false,
          ...(cutoff ? { ride: { startDate: { gte: cutoff } } } : {}),
        },
        include: { ride: { select: { distanceKm: true, type: true } } },
      },
      linkedUsers: {
        select: {
          earnedBadges: { include: { badge: true } },
        },
        take: 1,
      },
    },
  });

  const items = profiles
    .map((p) => {
      const totalKm = p.participations.reduce((s, x) => s + x.ride.distanceKm, 0);
      const ridesCount = p.participations.length;
      const badges =
        p.linkedUsers[0]?.earnedBadges.map((b) => ({
          tier: b.badge.tier,
          name: b.badge.name,
          icon: b.badge.icon,
          color: b.badge.color,
        })) ?? [];

      const base = {
        id: p.id,
        name: p.name,
        role: p.role,
        avatarUrl: p.avatarUrl,
        totalKm: Math.round(totalKm * 10) / 10,
        ridesCount,
        ridesOrganized: p.ridesOrganized,
        sweepsDone: p.sweepsDone,
        pilotsDone: p.pilotsDone,
        badges,
      };

      if (isPrivileged) {
        return {
          ...base,
          email: p.email,
          phone: p.phone,
          emergencyContact: p.emergencyContact,
          emergencyPhone: p.emergencyPhone,
          bloodGroup: p.bloodGroup,
        };
      }
      return base;
    })
    .sort((a, b) => b.totalKm - a.totalKm || b.ridesCount - a.ridesCount);

  return apiOk({ items });
}
