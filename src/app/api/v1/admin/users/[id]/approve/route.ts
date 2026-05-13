import { NextRequest, after } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer, isAdminRole } from "@/lib/api/v1/auth-guard";
import { notifyUser } from "@/lib/push/dispatch";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");
  if (!isAdminRole(auth.user.role)) return apiError("FORBIDDEN", "Admin only");

  const { id } = await params;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return apiError("NOT_FOUND", "User not found");

  await prisma.user.update({ where: { id }, data: { isApproved: true } });

  after(() =>
    notifyUser({
      userId: id,
      type: "success",
      title: "You're in!",
      message: "Your T2W account has been approved. Welcome to the brotherhood — ride safe.",
      data: { kind: "account_approved" },
    }).catch((err) => console.warn("[T2W][v1] approve push failed:", err)),
  );

  return apiOk({ success: true, id });
}
