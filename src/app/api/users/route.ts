import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { success, error } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    requireAdmin(currentUser);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // pending | active | all
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (status === "pending") {
      where.isApproved = false;
    } else if (status === "active") {
      where.isApproved = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        joinDate: true,
        isApproved: true,
        city: true,
        ridingExperience: true,
        totalKm: true,
        ridesCompleted: true,
        motorcycles: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return success({ users });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return error("Unauthorized", 401);
      if (err.message === "Forbidden") return error("Forbidden", 403);
    }
    console.error("Users list error:", err);
    return error("Failed to fetch users", 500);
  }
}
