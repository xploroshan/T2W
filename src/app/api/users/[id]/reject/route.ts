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

    await prisma.user.delete({ where: { id } });

    return success({ message: "User rejected and removed" });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return error("Unauthorized", 401);
      if (err.message === "Forbidden") return error("Forbidden", 403);
    }
    console.error("User reject error:", err);
    return error("Failed to reject user", 500);
  }
}
