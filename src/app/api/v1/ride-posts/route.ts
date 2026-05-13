import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getRolePermissions } from "@/lib/role-permissions";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer, isAdminRole } from "@/lib/api/v1/auth-guard";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

/**
 * GET /api/v1/ride-posts?rideId=…&status=approved|pending&cursor=…&limit=20
 *
 * Non-admins only see approved posts even if they pass ?status=pending. The
 * pending lane is reserved for moderators.
 */
export async function GET(req: NextRequest) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");

  const { searchParams } = req.nextUrl;
  const rideId = searchParams.get("rideId");
  const requestedStatus = searchParams.get("status");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") || "") || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );

  const where: Record<string, unknown> = {};
  if (rideId) where.rideId = rideId;
  if (isAdminRole(auth.user.role) && requestedStatus) {
    where.approvalStatus = requestedStatus;
  } else {
    where.approvalStatus = "approved";
  }

  const posts = await prisma.ridePost.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;

  return apiOk({
    items: page.map((p) => ({
      id: p.id,
      rideId: p.rideId,
      authorId: p.authorId,
      authorName: p.authorName,
      content: p.content,
      images: p.images ? (JSON.parse(p.images) as string[]) : [],
      approvalStatus: p.approvalStatus,
      approvedBy: p.approvedBy,
      createdAt: p.createdAt.toISOString(),
    })),
    nextCursor: hasMore && page.length > 0 ? page[page.length - 1].id : null,
  });
}

type CreateBody = {
  rideId?: string;
  content?: string;
  images?: string[];
};

export async function POST(req: NextRequest) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");

  const rolePerms = await getRolePermissions();
  const canPost =
    isAdminRole(auth.user.role) ||
    (auth.user.role === "t2w_rider" && rolePerms.t2w_rider.canPostRideTales);
  if (!canPost) {
    return apiError("FORBIDDEN", "Your role does not have permission to post ride tales");
  }

  const data = (await req.json()) as CreateBody;
  if (!data.rideId || !data.content?.trim()) {
    return apiError("BAD_REQUEST", "rideId and content are required");
  }
  const ride = await prisma.ride.findUnique({ where: { id: data.rideId } });
  if (!ride) return apiError("NOT_FOUND", "Ride not found");

  const isAdmin = isAdminRole(auth.user.role);
  const post = await prisma.ridePost.create({
    data: {
      rideId: data.rideId,
      authorId: auth.user.id,
      authorName: auth.user.name,
      content: data.content.trim(),
      images: data.images?.length ? JSON.stringify(data.images.slice(0, 10)) : null,
      approvalStatus: isAdmin ? "approved" : "pending",
      approvedBy: isAdmin ? auth.user.name : null,
    },
  });

  return apiOk(
    {
      post: {
        id: post.id,
        rideId: post.rideId,
        authorName: post.authorName,
        content: post.content,
        images: post.images ? (JSON.parse(post.images) as string[]) : [],
        approvalStatus: post.approvalStatus,
        createdAt: post.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
