import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer } from "@/lib/api/v1/auth-guard";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

export async function GET(req: NextRequest) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");

  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit = Math.min(
    Math.max(parseInt(req.nextUrl.searchParams.get("limit") || "") || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );

  const posts = await prisma.blogPost.findMany({
    where: { approvalStatus: "approved" },
    orderBy: [{ publishDate: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;

  return apiOk({
    items: page.map((p) => ({
      id: p.id,
      title: p.title,
      excerpt: p.excerpt,
      coverImage: p.coverImage,
      authorName: p.authorName,
      authorAvatar: p.authorAvatar,
      readTime: p.readTime,
      publishDate: p.publishDate.toISOString(),
      videoUrl: p.videoUrl,
      isVlog: p.isVlog,
      type: p.type,
      tags: p.tags ? (JSON.parse(p.tags) as string[]) : [],
      likes: p.likes,
    })),
    nextCursor: hasMore && page.length > 0 ? page[page.length - 1].id : null,
  });
}
