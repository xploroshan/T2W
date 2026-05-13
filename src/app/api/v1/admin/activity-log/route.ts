import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer, isAdminRole } from "@/lib/api/v1/auth-guard";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(req: NextRequest) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");
  if (!isAdminRole(auth.user.role)) return apiError("FORBIDDEN", "Admin only");

  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit = Math.min(
    Math.max(parseInt(req.nextUrl.searchParams.get("limit") || "") || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );

  const logs = await prisma.activityLog.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = logs.length > limit;
  const page = hasMore ? logs.slice(0, limit) : logs;

  return apiOk({
    items: page.map((l) => ({
      id: l.id,
      action: l.action,
      performedBy: l.performedBy,
      performedByName: l.performedByName,
      targetId: l.targetId,
      targetName: l.targetName,
      details: l.details,
      hasRollback: !!l.rollbackData,
      createdAt: l.createdAt.toISOString(),
    })),
    nextCursor: hasMore && page.length > 0 ? page[page.length - 1].id : null,
  });
}
