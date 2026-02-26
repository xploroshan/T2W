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

    const existing = await prisma.motorcycle.findUnique({ where: { id } });
    if (!existing) return error("Motorcycle not found", 404);
    if (existing.userId !== currentUser.id) return error("Forbidden", 403);

    const body = await request.json();
    const data: Record<string, unknown> = {};
    for (const field of ["make", "model", "year", "cc", "color", "nickname", "imageUrl"]) {
      if (body[field] !== undefined) data[field] = body[field];
    }

    const motorcycle = await prisma.motorcycle.update({ where: { id }, data });
    return success({ motorcycle });
  } catch (err) {
    console.error("Motorcycle update error:", err);
    return error("Failed to update motorcycle", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return error("Unauthorized", 401);
    const { id } = await params;

    const existing = await prisma.motorcycle.findUnique({ where: { id } });
    if (!existing) return error("Motorcycle not found", 404);
    if (existing.userId !== currentUser.id) return error("Forbidden", 403);

    await prisma.motorcycle.delete({ where: { id } });
    return success({ message: "Motorcycle deleted" });
  } catch (err) {
    console.error("Motorcycle delete error:", err);
    return error("Failed to delete motorcycle", 500);
  }
}
