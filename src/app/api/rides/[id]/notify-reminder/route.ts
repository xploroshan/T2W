import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendRideReminderEmails } from "@/lib/email";
import { after } from "next/server";

// POST /api/rides/:id/notify-reminder
// Admin-triggered "don't forget to register" reminder email.
// Sends to all approved members (or notifyRides=true subset) who have not
// yet registered for this ride.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !["superadmin", "core_member"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: rideId } = await params;
    const body = await req.json();
    const notifyMode = body.notifyMode === "selected" ? "selected" : "all";

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      select: {
        id: true, rideNumber: true, title: true,
        startLocation: true, endLocation: true,
        startDate: true, endDate: true,
        distanceKm: true, description: true,
        posterUrl: true, fee: true, leadRider: true,
      },
    });
    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }

    after(async () => {
      try {
        await sendRideReminderEmails(rideId, ride, notifyMode);
      } catch (err) {
        console.error("[T2W] Reminder email error:", err);
      }
    });

    console.log(`[T2W] Reminder queued for ride ${rideId} by ${currentUser.email} (mode=${notifyMode})`);
    return NextResponse.json({ queued: true, mode: notifyMode });
  } catch (error) {
    console.error("[T2W] Reminder endpoint error:", error);
    return NextResponse.json({ error: "Failed to send reminder" }, { status: 500 });
  }
}
