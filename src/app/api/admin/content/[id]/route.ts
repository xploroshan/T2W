import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { success, error } from "@/lib/api";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    requireAdmin(currentUser);
    const { id } = await params;

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.type !== undefined) data.type = body.type;
    if (body.status !== undefined) data.status = body.status;
    data.lastUpdated = new Date();

    const content = await prisma.content.update({ where: { id }, data });
    return success({ content });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return error("Unauthorized", 401);
      if (err.message === "Forbidden") return error("Forbidden", 403);
    }
    console.error("Content update error:", err);
    return error("Failed to update content", 500);
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

    await prisma.content.delete({ where: { id } });
    return success({ message: "Content deleted" });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return error("Unauthorized", 401);
      if (err.message === "Forbidden") return error("Forbidden", 403);
    }
    console.error("Content delete error:", err);
    return error("Failed to delete content", 500);
  }
}
