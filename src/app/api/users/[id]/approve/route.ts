import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { success, error } from "@/lib/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    requireAdmin(currentUser);
    const { id } = await params;

    const user = await prisma.user.update({
      where: { id },
      data: { isApproved: true },
      select: {
        id: true,
        name: true,
        email: true,
        isApproved: true,
      },
    });

    // Send approval notification
    await prisma.notification.create({
      data: {
        title: "Account Approved!",
        message:
          "Your T2W account has been approved. Welcome to the community! You can now register for rides.",
        type: "success",
        userId: id,
      },
    });

    return success({ user, message: "User approved successfully" });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return error("Unauthorized", 401);
      if (err.message === "Forbidden") return error("Forbidden", 403);
    }
    console.error("User approve error:", err);
    return error("Failed to approve user", 500);
  }
}
