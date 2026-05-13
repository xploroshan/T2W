import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer, isAdminRole } from "@/lib/api/v1/auth-guard";

/**
 * GET /api/v1/admin/users?status=pending|active&search=…&cursor=…&limit=20
 *
 * Admin user list. Pending (isApproved=false) is the moderation queue —
 * the most common mobile use case.
 */
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");
  if (!isAdminRole(auth.user.role)) return apiError("FORBIDDEN", "Admin only");

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search") ?? "";
  const cursor = searchParams.get("cursor");
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") || "") || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );

  const where: Record<string, unknown> = {};
  if (status === "pending") where.isApproved = false;
  else if (status === "active") where.isApproved = true;
  if (search.trim()) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isApproved: true,
      city: true,
      ridingExperience: true,
      joinDate: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = users.length > limit;
  const page = hasMore ? users.slice(0, limit) : users;

  return apiOk({
    items: page.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      isApproved: u.isApproved,
      city: u.city,
      ridingExperience: u.ridingExperience,
      joinDate: u.joinDate.toISOString(),
    })),
    nextCursor: hasMore && page.length > 0 ? page[page.length - 1].id : null,
  });
}
