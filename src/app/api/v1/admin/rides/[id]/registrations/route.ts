import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer, isAdminRole } from "@/lib/api/v1/auth-guard";

/**
 * GET /api/v1/admin/rides/:id/registrations?status=pending|confirmed|rejected
 *
 * Full PII registration list for moderation.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");
  if (!isAdminRole(auth.user.role)) return apiError("FORBIDDEN", "Admin only");

  const { id: rideId } = await params;
  const status = req.nextUrl.searchParams.get("status");

  const where: Record<string, unknown> = { rideId };
  if (status) where.approvalStatus = status;

  const regs = await prisma.rideRegistration.findMany({
    where,
    orderBy: { registeredAt: "asc" },
  });

  return apiOk({
    items: regs.map((r) => ({
      id: r.id,
      userId: r.userId,
      riderName: r.riderName,
      email: r.email,
      phone: r.phone,
      bloodGroup: r.bloodGroup,
      vehicleModel: r.vehicleModel,
      vehicleRegNumber: r.vehicleRegNumber,
      emergencyContactName: r.emergencyContactName,
      emergencyContactPhone: r.emergencyContactPhone,
      accommodationType: r.accommodationType,
      approvalStatus: r.approvalStatus,
      paymentScreenshot: r.paymentScreenshot || null,
      upiTransactionId: r.upiTransactionId || null,
      confirmationCode: r.confirmationCode || null,
      registeredAt: r.registeredAt.toISOString(),
    })),
  });
}
