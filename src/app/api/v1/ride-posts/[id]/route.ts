import { NextRequest, after } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer, isAdminRole } from "@/lib/api/v1/auth-guard";
import { notifyUser } from "@/lib/push/dispatch";

type PatchBody = {
  approvalStatus?: "pending" | "approved" | "rejected";
  content?: string;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");
  if (!isAdminRole(auth.user.role)) return apiError("FORBIDDEN", "Admin only");

  const { id } = await params;
  const before = await prisma.ridePost.findUnique({ where: { id } });
  if (!before) return apiError("NOT_FOUND", "Ride post not found");

  const data = (await req.json()) as PatchBody;
  const updateData: Record<string, unknown> = {};
  if (data.approvalStatus) {
    updateData.approvalStatus = data.approvalStatus;
    updateData.approvedBy = auth.user.name;
  }
  if (data.content !== undefined) updateData.content = data.content;

  const post = await prisma.ridePost.update({ where: { id }, data: updateData });

  if (
    before.authorId &&
    data.approvalStatus &&
    before.approvalStatus !== data.approvalStatus &&
    (data.approvalStatus === "approved" || data.approvalStatus === "rejected")
  ) {
    const isApproved = data.approvalStatus === "approved";
    const authorId = before.authorId;
    const rideId = before.rideId;
    after(() =>
      notifyUser({
        userId: authorId,
        type: isApproved ? "success" : "warning",
        title: isApproved ? "Ride post approved" : "Ride post needs changes",
        message: isApproved
          ? "Your photo post is live for everyone to see."
          : "Your photo post wasn't approved. Tap for details.",
        data: { kind: "ride", rideId },
      }).catch((err) => console.warn("[T2W][v1] ride-post push failed:", err)),
    );
  }

  return apiOk({
    post: {
      id: post.id,
      approvalStatus: post.approvalStatus,
      approvedBy: post.approvedBy,
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");

  const { id } = await params;
  const existing = await prisma.ridePost.findUnique({ where: { id } });
  if (!existing) return apiError("NOT_FOUND", "Ride post not found");

  const isOwner = existing.authorId === auth.user.id;
  if (!isAdminRole(auth.user.role) && !isOwner) {
    return apiError("FORBIDDEN", "Not yours to delete");
  }

  await prisma.ridePost.delete({ where: { id } });
  return apiOk({ success: true });
}
