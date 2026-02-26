import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { success, error } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const difficulty = searchParams.get("difficulty");

    const where: Record<string, unknown> = {};

    if (status && status !== "all") {
      where.status = status;
    }
    if (type && type !== "all") {
      where.type = type;
    }
    if (difficulty && difficulty !== "all") {
      where.difficulty = difficulty;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { startLocation: { contains: search } },
        { endLocation: { contains: search } },
      ];
    }

    const rides = await prisma.ride.findMany({
      where,
      include: {
        _count: { select: { registrations: true } },
      },
      orderBy: { startDate: "desc" },
    });

    const ridesWithCount = rides.map((ride) => ({
      ...ride,
      route: JSON.parse(ride.route),
      highlights: JSON.parse(ride.highlights),
      registeredRiders: ride._count.registrations,
      _count: undefined,
    }));

    return success({ rides: ridesWithCount });
  } catch (err) {
    console.error("Rides list error:", err);
    return error("Failed to fetch rides", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    requireAdmin(currentUser);

    const body = await request.json();
    const {
      title,
      rideNumber,
      type,
      startDate,
      endDate,
      startLocation,
      endLocation,
      route,
      distanceKm,
      maxRiders,
      difficulty,
      description,
      highlights,
      posterUrl,
      fee,
      leadRider,
      sweepRider,
    } = body;

    if (!title || !rideNumber || !startDate || !endDate || !startLocation || !endLocation) {
      return error("Missing required ride fields");
    }

    const ride = await prisma.ride.create({
      data: {
        title,
        rideNumber,
        type: type || "day",
        status: "upcoming",
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        startLocation,
        endLocation,
        route: JSON.stringify(route || []),
        distanceKm: distanceKm || 0,
        maxRiders: maxRiders || 20,
        difficulty: difficulty || "moderate",
        description: description || "",
        highlights: JSON.stringify(highlights || []),
        posterUrl: posterUrl || null,
        fee: fee || 0,
        leadRider: leadRider || "",
        sweepRider: sweepRider || "",
      },
    });

    return success(
      {
        ride: {
          ...ride,
          route: JSON.parse(ride.route),
          highlights: JSON.parse(ride.highlights),
          registeredRiders: 0,
        },
      },
      201
    );
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return error("Unauthorized", 401);
      if (err.message === "Forbidden") return error("Forbidden", 403);
    }
    console.error("Ride create error:", err);
    return error("Failed to create ride", 500);
  }
}
