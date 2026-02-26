import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { success, error } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const isVlog = searchParams.get("isVlog");
    const search = searchParams.get("search");
    const tag = searchParams.get("tag");

    const where: Record<string, unknown> = {};

    if (type && type !== "all") where.type = type;
    if (isVlog === "true") where.isVlog = true;
    if (isVlog === "false") where.isVlog = false;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { excerpt: { contains: search } },
        { authorName: { contains: search } },
      ];
    }
    if (tag) {
      where.tags = { contains: tag };
    }

    const blogs = await prisma.blogPost.findMany({
      where,
      orderBy: { publishDate: "desc" },
    });

    const blogsFormatted = blogs.map((blog) => ({
      ...blog,
      tags: JSON.parse(blog.tags),
    }));

    return success({ blogs: blogsFormatted });
  } catch (err) {
    console.error("Blogs list error:", err);
    return error("Failed to fetch blogs", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return error("Unauthorized", 401);

    const body = await request.json();
    const {
      title,
      excerpt,
      content,
      coverImage,
      tags,
      type,
      isVlog,
      videoUrl,
      readTime,
    } = body;

    if (!title || !excerpt) {
      return error("Title and excerpt are required");
    }

    const blog = await prisma.blogPost.create({
      data: {
        title,
        excerpt,
        content: content || "",
        authorId: currentUser.id,
        authorName: currentUser.name,
        coverImage: coverImage || null,
        tags: JSON.stringify(tags || []),
        type: type || "personal",
        isVlog: isVlog || false,
        videoUrl: videoUrl || null,
        readTime: readTime || 5,
      },
    });

    return success(
      { blog: { ...blog, tags: JSON.parse(blog.tags) } },
      201
    );
  } catch (err) {
    console.error("Blog create error:", err);
    return error("Failed to create blog", 500);
  }
}
