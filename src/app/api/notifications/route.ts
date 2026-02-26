import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { success, error } from "@/lib/api";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    // If not logged in, return global notifications
    const where = currentUser
      ? { OR: [{ userId: currentUser.id }, { userId: null }] }
      : { userId: null };

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { date: "desc" },
      take: 20,
    });

    return success({ notifications });
  } catch (err) {
    console.error("Notifications error:", err);
    return error("Failed to fetch notifications", 500);
  }
}
