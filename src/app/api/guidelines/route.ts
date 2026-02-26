import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { success, error } from "@/lib/api";

export async function GET() {
  try {
    const guidelines = await prisma.guideline.findMany();
    return success({ guidelines });
  } catch (err) {
    console.error("Guidelines error:", err);
    return error("Failed to fetch guidelines", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    requireAdmin(currentUser);

    const body = await request.json();
    const { title, content, category, icon } = body;

    if (!title || !content) {
      return error("Title and content are required");
    }

    const guideline = await prisma.guideline.create({
      data: {
        title,
        content,
        category: category || "general",
        icon: icon || "info",
      },
    });

    return success({ guideline }, 201);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return error("Unauthorized", 401);
      if (err.message === "Forbidden") return error("Forbidden", 403);
    }
    console.error("Guideline create error:", err);
    return error("Failed to create guideline", 500);
  }
}
