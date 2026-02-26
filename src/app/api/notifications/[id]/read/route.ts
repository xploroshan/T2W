import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { success, error } from "@/lib/api";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return error("Unauthorized", 401);
    const { id } = await params;

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return success({ notification });
  } catch (err) {
    console.error("Mark read error:", err);
    return error("Failed to mark notification as read", 500);
  }
}
