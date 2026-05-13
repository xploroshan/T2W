import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { computeRideStatus } from "@/lib/ride-status";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer } from "@/lib/api/v1/auth-guard";

type RegisterBody = {
  riderName?: string;
  email?: string;
  phone?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodGroup?: string;
  referredBy?: string;
  foodPreference?: string;
  ridingType?: string;
  vehicleModel?: string;
  vehicleRegNumber?: string;
  tshirtSize?: string;
  agreedCancellationTerms?: boolean;
  agreedIndemnity?: boolean;
  paymentScreenshot?: string;
  upiTransactionId?: string;
};

/**
 * POST /api/v1/rides/:id/register
 *
 * Mirrors the web ride-registration semantics — staggered open windows by
 * role, capacity check inside a transaction (TOCTOU-safe), auto-assigned
 * accommodation type, and self-healing of prior drop-outs. Email delivery
 * is intentionally NOT included here: mobile registration emails will be
 * dispatched by a follow-up notifications path so this handler stays fast.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");

  const { id: rideId } = await params;
  const data = (await req.json()) as RegisterBody;

  if (!data.agreedCancellationTerms || !data.agreedIndemnity) {
    return apiError("BAD_REQUEST", "You must agree to cancellation terms and the indemnity.");
  }

  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: {
      registrations: { select: { approvalStatus: true, accommodationType: true } },
    },
  });
  if (!ride) return apiError("NOT_FOUND", "Ride not found");

  const dynamicStatus = computeRideStatus(ride.startDate, ride.endDate, ride.status);
  if (dynamicStatus !== "upcoming") {
    const msg =
      dynamicStatus === "ongoing"
        ? "Registration is closed — this ride has already started"
        : dynamicStatus === "completed"
          ? "Registration is closed — this ride has already ended"
          : "Registration is not available for this ride";
    return apiError("CONFLICT", msg);
  }

  // Tier-gated open windows
  const now = new Date();
  const role = auth.user.role;
  const openAt =
    role === "superadmin" || role === "core_member"
      ? ride.regOpenCore
      : role === "t2w_rider"
        ? ride.regOpenT2w
        : ride.regOpenRider;
  if (openAt && now < openAt) {
    return apiError(
      "FORBIDDEN",
      "Registration is not yet open for your tier. Please check back later.",
      { regOpenAt: openAt.toISOString() },
    );
  }

  const active = ride.registrations.filter(
    (r) => r.approvalStatus === "pending" || r.approvalStatus === "confirmed",
  );
  const totalCapacity = ride.maxRiders + (ride.extraBedSlots ?? 0);
  if (active.length >= totalCapacity) {
    return apiError("RIDE_FULL", "This ride is full — no spots available");
  }

  const confirmedBeds = active.filter((r) => r.accommodationType !== "extra-bed").length;
  const accommodation: "bed" | "extra-bed" =
    confirmedBeds < ride.maxRiders ? "bed" : "extra-bed";

  const confirmationCode = `T2W-${rideId.toUpperCase().slice(0, 10)}-${randomBytes(8).toString("hex").toUpperCase()}`;

  const registrationData = {
    riderName: data.riderName?.trim() || auth.user.name,
    address: data.address ?? "",
    email: data.email?.trim() || auth.user.email,
    phone: data.phone ?? "",
    emergencyContactName: data.emergencyContactName ?? "",
    emergencyContactPhone: data.emergencyContactPhone ?? "",
    bloodGroup: data.bloodGroup ?? "",
    referredBy: data.referredBy ?? "",
    foodPreference: data.foodPreference ?? "",
    ridingType: data.ridingType ?? "",
    vehicleModel: data.vehicleModel ?? "",
    vehicleRegNumber: data.vehicleRegNumber ?? "",
    tshirtSize: data.tshirtSize ?? "",
    accommodationType: accommodation,
    agreedCancellationTerms: Boolean(data.agreedCancellationTerms),
    agreedIndemnity: Boolean(data.agreedIndemnity),
    paymentScreenshot: data.paymentScreenshot ?? "",
    upiTransactionId: data.upiTransactionId ?? "",
    confirmationCode,
    approvalStatus: "pending" as const,
    registeredAt: new Date(),
  };

  try {
    const reg = await prisma.$transaction(async (tx) => {
      const count = await tx.rideRegistration.count({
        where: { rideId, approvalStatus: { in: ["pending", "confirmed"] } },
      });
      if (count >= totalCapacity) {
        throw Object.assign(new Error("RIDE_FULL"), { code: "RIDE_FULL" });
      }
      const r = await tx.rideRegistration.upsert({
        where: { userId_rideId: { userId: auth.user.id, rideId } },
        update: registrationData,
        create: { userId: auth.user.id, rideId, ...registrationData },
      });
      if (auth.user.linkedRiderId) {
        await tx.rideParticipation.updateMany({
          where: {
            riderProfileId: auth.user.linkedRiderId,
            rideId,
            droppedOut: true,
          },
          data: { droppedOut: false },
        });
      }
      return r;
    });

    return apiOk({
      registration: {
        id: reg.id,
        confirmationCode: reg.confirmationCode,
        approvalStatus: reg.approvalStatus,
        accommodationType: reg.accommodationType,
        registeredAt: reg.registeredAt.toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "RIDE_FULL") {
      return apiError("RIDE_FULL", "This ride is full — no spots available");
    }
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return apiError("ALREADY_REGISTERED", "You are already registered for this ride");
    }
    console.error("[T2W][v1] register error:", err);
    return apiError("SERVER_ERROR", "Failed to register for ride");
  }
}
