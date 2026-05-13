import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer, isAdminRole } from "@/lib/api/v1/auth-guard";

type PatchBody = Partial<{
  title: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  startLocation: string;
  startLocationUrl: string;
  endLocation: string;
  endLocationUrl: string;
  route: Array<{ lat: number; lng: number } | string>;
  distanceKm: number;
  maxRiders: number;
  extraBedSlots: number;
  difficulty: string;
  description: string;
  highlights: string[];
  posterUrl: string;
  fee: number;
  leadRider: string;
  sweepRider: string;
  organisedBy: string;
  accountsBy: string;
  meetupTime: string;
  rideStartTime: string;
  startingPoint: string;
  detailsVisible: boolean;
  regOpenCore: string | null;
  regOpenT2w: string | null;
  regOpenRider: string | null;
}>;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");
  if (!isAdminRole(auth.user.role)) return apiError("FORBIDDEN", "Admin only");

  const { id } = await params;
  const existing = await prisma.ride.findUnique({ where: { id } });
  if (!existing) return apiError("NOT_FOUND", "Ride not found");

  const data = (await req.json()) as PatchBody;
  const updateData: Record<string, unknown> = {};
  const scalar: (keyof PatchBody)[] = [
    "title",
    "type",
    "status",
    "startLocation",
    "startLocationUrl",
    "endLocation",
    "endLocationUrl",
    "distanceKm",
    "maxRiders",
    "extraBedSlots",
    "difficulty",
    "description",
    "posterUrl",
    "fee",
    "leadRider",
    "sweepRider",
    "organisedBy",
    "accountsBy",
    "meetupTime",
    "rideStartTime",
    "startingPoint",
    "detailsVisible",
  ];
  for (const field of scalar) {
    if (data[field] !== undefined) updateData[field] = data[field];
  }
  if (data.startDate) updateData.startDate = new Date(data.startDate);
  if (data.endDate) updateData.endDate = new Date(data.endDate);
  if (data.route) updateData.route = JSON.stringify(data.route);
  if (data.highlights) updateData.highlights = JSON.stringify(data.highlights);
  if (data.regOpenCore !== undefined) {
    updateData.regOpenCore = data.regOpenCore ? new Date(data.regOpenCore) : null;
  }
  if (data.regOpenT2w !== undefined) {
    updateData.regOpenT2w = data.regOpenT2w ? new Date(data.regOpenT2w) : null;
  }
  if (data.regOpenRider !== undefined) {
    updateData.regOpenRider = data.regOpenRider ? new Date(data.regOpenRider) : null;
  }

  const updated = await prisma.ride.update({ where: { id }, data: updateData });
  return apiOk({ ride: { id: updated.id, rideNumber: updated.rideNumber } });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");
  if (auth.user.role !== "superadmin") {
    return apiError("FORBIDDEN", "Only super admins can delete rides");
  }

  const { id } = await params;
  const existing = await prisma.ride.findUnique({ where: { id } });
  if (!existing) return apiError("NOT_FOUND", "Ride not found");

  await prisma.ride.delete({ where: { id } });
  return apiOk({ success: true });
}
