import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer } from "@/lib/api/v1/auth-guard";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");
  const { id } = await params;

  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post || post.approvalStatus !== "approved") {
    return apiError("NOT_FOUND", "Blog post not found");
  }

  return apiOk({
    blog: {
      id: post.id,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      coverImage: post.coverImage,
      authorId: post.authorId,
      authorName: post.authorName,
      authorAvatar: post.authorAvatar,
      readTime: post.readTime,
      publishDate: post.publishDate.toISOString(),
      videoUrl: post.videoUrl,
      isVlog: post.isVlog,
      type: post.type,
      tags: post.tags ? (JSON.parse(post.tags) as string[]) : [],
      likes: post.likes,
    },
  });
}
