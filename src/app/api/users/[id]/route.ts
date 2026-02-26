import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { success, error } from "@/lib/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
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
        earnedBadges: { include: { badge: true } },
      },
    });

    if (!user) {
      return error("User not found", 404);
    }

    return success({ user });
  } catch (err) {
    console.error("User fetch error:", err);
    return error("Failed to fetch user", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    const { id } = await params;

    // Users can update their own profile, admins can update anyone
    if (!currentUser) return error("Unauthorized", 401);
    if (currentUser.id !== id && currentUser.role !== "admin" && currentUser.role !== "superadmin") {
      return error("Forbidden", 403);
    }

    const body = await request.json();
    const { name, phone, city, ridingExperience, role, isApproved } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (city !== undefined) data.city = city;
    if (ridingExperience !== undefined) data.ridingExperience = ridingExperience;

    // Only admins can change role and approval status
    if (currentUser.role === "admin" || currentUser.role === "superadmin") {
      if (role !== undefined) data.role = role;
      if (isApproved !== undefined) data.isApproved = isApproved;
    }

    const user = await prisma.user.update({
      where: { id },
      data,
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
      },
    });

    return success({ user });
  } catch (err) {
    console.error("User update error:", err);
    return error("Failed to update user", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    requireAdmin(currentUser);
    const { id } = await params;

    await prisma.user.delete({ where: { id } });
    return success({ message: "User deleted" });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return error("Unauthorized", 401);
      if (err.message === "Forbidden") return error("Forbidden", 403);
    }
    console.error("User delete error:", err);
    return error("Failed to delete user", 500);
  }
}
