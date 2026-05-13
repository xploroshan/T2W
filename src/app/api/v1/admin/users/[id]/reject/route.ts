import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer, isAdminRole } from "@/lib/api/v1/auth-guard";

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

  await prisma.user.delete({ where: { id } });
  return apiOk({ success: true, id });
}
