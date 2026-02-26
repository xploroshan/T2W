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
    const blog = await prisma.blogPost.findUnique({ where: { id } });

    if (!blog) return error("Blog not found", 404);

    return success({ blog: { ...blog, tags: JSON.parse(blog.tags) } });
  } catch (err) {
    console.error("Blog fetch error:", err);
    return error("Failed to fetch blog", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return error("Unauthorized", 401);
    const { id } = await params;

    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) return error("Blog not found", 404);

    // Author or admin can edit
    if (
      existing.authorId !== currentUser.id &&
      currentUser.role !== "admin" &&
      currentUser.role !== "superadmin"
    ) {
      return error("Forbidden", 403);
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    for (const field of ["title", "excerpt", "content", "coverImage", "type", "isVlog", "videoUrl", "readTime"]) {
      if (body[field] !== undefined) data[field] = body[field];
    }
    if (body.tags) data.tags = JSON.stringify(body.tags);

    const blog = await prisma.blogPost.update({ where: { id }, data });
    return success({ blog: { ...blog, tags: JSON.parse(blog.tags) } });
  } catch (err) {
    console.error("Blog update error:", err);
    return error("Failed to update blog", 500);
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

    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) return error("Blog not found", 404);

    if (
      existing.authorId !== currentUser.id &&
      currentUser.role !== "admin" &&
      currentUser.role !== "superadmin"
    ) {
      return error("Forbidden", 403);
    }

    await prisma.blogPost.delete({ where: { id } });
    return success({ message: "Blog deleted" });
  } catch (err) {
    console.error("Blog delete error:", err);
    return error("Failed to delete blog", 500);
  }
}
