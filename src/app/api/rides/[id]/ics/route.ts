import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildIcs } from "@/lib/calendar";

// GET /api/rides/[id]/ics
//
// Returns a text/calendar attachment for the requested ride. **Public** —
// any caller who knows a ride ID can add it to their calendar. This
// matches the open visibility of the ride listing and avoids forcing
// people through a registration funnel just to add a date.
//
// The .ics body uses UTC times (Z suffix). Calendar apps render in the
// user's local timezone automatically.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ride = await prisma.ride.findUnique({ where: { id } });
  if (!ride) {
    return NextResponse.json({ error: "Ride not found" }, { status: 404 });
  }

  const body = buildIcs({
    id: ride.id,
    rideNumber: ride.rideNumber,
    title: ride.title,
    description: ride.description,
    startDate: ride.startDate,
    endDate: ride.endDate,
    startLocation: ride.startLocation,
    startingPoint: ride.startingPoint,
    leadRider: ride.leadRider,
    distanceKm: ride.distanceKm,
    fee: ride.fee,
  });

  // Filename slug: alphanumerics + dashes, lower-cased. Stable enough to
  // group repeat downloads in the calendar UI.
  const slug = `${ride.rideNumber ?? ride.id}-${ride.title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
      // Short cache to allow CDN dedup of the same file from many users
      // while still picking up admin edits within a few minutes.
      "Cache-Control": "public, max-age=300",
    },
  });
}
