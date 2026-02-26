import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { success, error } from "@/lib/api";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return error("Unauthorized", 401);

    // Get user's ride registrations
    const registrations = await prisma.rideRegistration.findMany({
      where: { userId: currentUser.id },
      include: { ride: true },
    });

    const completedRides = registrations.filter(
      (r) => r.ride.status === "completed"
    );
    const upcomingRides = registrations.filter(
      (r) => r.ride.status === "upcoming"
    );

    return success({
      stats: {
        totalKm: currentUser.totalKm,
        ridesCompleted: currentUser.ridesCompleted,
        badgesEarned: currentUser.earnedBadges.length,
        motorcyclesCount: currentUser.motorcycles.length,
      },
      completedRides: completedRides.map((r) => ({
        ...r.ride,
        route: JSON.parse(r.ride.route),
        highlights: JSON.parse(r.ride.highlights),
      })),
      upcomingRides: upcomingRides.map((r) => ({
        ...r.ride,
        route: JSON.parse(r.ride.route),
        highlights: JSON.parse(r.ride.highlights),
      })),
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return error("Failed to fetch dashboard stats", 500);
  }
}
