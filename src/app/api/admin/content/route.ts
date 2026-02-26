import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { success, error } from "@/lib/api";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    requireAdmin(currentUser);

    const content = await prisma.content.findMany({
      orderBy: { lastUpdated: "desc" },
    });

    return success({ content });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return error("Unauthorized", 401);
      if (err.message === "Forbidden") return error("Forbidden", 403);
    }
    console.error("Content list error:", err);
    return error("Failed to fetch content", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    requireAdmin(currentUser);

    const body = await request.json();
    const { title, type, status } = body;

    if (!title) return error("Title is required");

    const content = await prisma.content.create({
      data: {
        title,
        type: type || "Document",
        status: status || "draft",
      },
    });

    return success({ content }, 201);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return error("Unauthorized", 401);
      if (err.message === "Forbidden") return error("Forbidden", 403);
    }
    console.error("Content create error:", err);
    return error("Failed to create content", 500);
  }
}
