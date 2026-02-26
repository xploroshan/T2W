import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { success, error } from "@/lib/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return error("Unauthorized", 401);
    if (!currentUser.isApproved) {
      return error("Your account must be approved before registering for rides", 403);
    }

    const { id: rideId } = await params;

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { _count: { select: { registrations: true } } },
    });

    if (!ride) return error("Ride not found", 404);
    if (ride.status !== "upcoming") return error("Registration is closed for this ride");
    if (ride._count.registrations >= ride.maxRiders) {
      return error("This ride is fully booked");
    }

    // Check if already registered
    const existing = await prisma.rideRegistration.findUnique({
      where: { userId_rideId: { userId: currentUser.id, rideId } },
    });
    if (existing) return error("You are already registered for this ride");

    const body = await request.json().catch(() => ({}));

    const confirmationCode = `${ride.rideNumber}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    const registration = await prisma.rideRegistration.create({
      data: {
        userId: currentUser.id,
        rideId,
        agreedIndemnity: body.agreedIndemnity ?? true,
        confirmationCode,
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        title: `Registered for ${ride.title}`,
        message: `You're confirmed for ${ride.title}. Confirmation code: ${confirmationCode}`,
        type: "success",
        userId: currentUser.id,
      },
    });

    return success({ registration, confirmationCode }, 201);
  } catch (err) {
    console.error("Ride registration error:", err);
    return error("Failed to register for ride", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return error("Unauthorized", 401);

    const { id: rideId } = await params;

    await prisma.rideRegistration.delete({
      where: { userId_rideId: { userId: currentUser.id, rideId } },
    });

    return success({ message: "Registration cancelled" });
  } catch (err) {
    console.error("Ride unregister error:", err);
    return error("Failed to cancel registration", 500);
  }
}
