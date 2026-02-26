import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { success, error } from "@/lib/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ride = await prisma.ride.findUnique({
      where: { id },
      include: {
        _count: { select: { registrations: true } },
        registrations: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
      },
    });

    if (!ride) {
      return error("Ride not found", 404);
    }

    return success({
      ride: {
        ...ride,
        route: JSON.parse(ride.route),
        highlights: JSON.parse(ride.highlights),
        registeredRiders: ride._count.registrations,
        _count: undefined,
      },
    });
  } catch (err) {
    console.error("Ride fetch error:", err);
    return error("Failed to fetch ride", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    requireAdmin(currentUser);
    const { id } = await params;

    const body = await request.json();
    const data: Record<string, unknown> = {};

    const fields = [
      "title",
      "rideNumber",
      "type",
      "status",
      "startLocation",
      "endLocation",
      "distanceKm",
      "maxRiders",
      "difficulty",
      "description",
      "posterUrl",
      "fee",
      "leadRider",
      "sweepRider",
    ];

    for (const field of fields) {
      if (body[field] !== undefined) data[field] = body[field];
    }

    if (body.startDate) data.startDate = new Date(body.startDate);
    if (body.endDate) data.endDate = new Date(body.endDate);
    if (body.route) data.route = JSON.stringify(body.route);
    if (body.highlights) data.highlights = JSON.stringify(body.highlights);

    const ride = await prisma.ride.update({
      where: { id },
      data,
      include: { _count: { select: { registrations: true } } },
    });

    return success({
      ride: {
        ...ride,
        route: JSON.parse(ride.route),
        highlights: JSON.parse(ride.highlights),
        registeredRiders: ride._count.registrations,
        _count: undefined,
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return error("Unauthorized", 401);
      if (err.message === "Forbidden") return error("Forbidden", 403);
    }
    console.error("Ride update error:", err);
    return error("Failed to update ride", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    requireAdmin(currentUser);
    const { id } = await params;

    await prisma.ride.delete({ where: { id } });
    return success({ message: "Ride deleted" });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return error("Unauthorized", 401);
      if (err.message === "Forbidden") return error("Forbidden", 403);
    }
    console.error("Ride delete error:", err);
    return error("Failed to delete ride", 500);
  }
}
