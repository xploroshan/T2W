import { prisma } from "@/lib/db";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { success, error } from "@/lib/api";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    requireAdmin(currentUser);

    const [
      totalUsers,
      pendingUsers,
      activeRides,
      totalContent,
      totalRides,
      totalBlogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isApproved: false } }),
      prisma.ride.count({ where: { status: "upcoming" } }),
      prisma.content.count(),
      prisma.ride.count(),
      prisma.blogPost.count(),
    ]);

    return success({
      stats: {
        totalUsers,
        pendingUsers,
        activeRides,
        totalContent,
        totalRides,
        totalBlogs,
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return error("Unauthorized", 401);
      if (err.message === "Forbidden") return error("Forbidden", 403);
    }
    console.error("Admin stats error:", err);
    return error("Failed to fetch admin stats", 500);
  }
}
