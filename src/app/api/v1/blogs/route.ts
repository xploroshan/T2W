import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getRolePermissions } from "@/lib/role-permissions";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer, isAdminRole } from "@/lib/api/v1/auth-guard";

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

type CreateBody = {
  title?: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  tags?: string[];
  type?: "official" | "personal";
  isVlog?: boolean;
  videoUrl?: string;
  readTime?: number;
};

export async function POST(req: NextRequest) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");

  const rolePerms = await getRolePermissions();
  const isAdmin = isAdminRole(auth.user.role);
  const canPost =
    isAdmin ||
    (auth.user.role === "t2w_rider" && rolePerms.t2w_rider.canPostBlog);
  if (!canPost) {
    return apiError("FORBIDDEN", "Your role does not have permission to post blogs");
  }

  const data = (await req.json()) as CreateBody;
  if (!data.title?.trim() || !data.content?.trim() || !data.excerpt?.trim()) {
    return apiError("BAD_REQUEST", "title, excerpt, and content are required");
  }

  const blog = await prisma.blogPost.create({
    data: {
      title: data.title.trim(),
      excerpt: data.excerpt.trim(),
      content: data.content,
      authorId: auth.user.id,
      authorName: auth.user.name,
      authorAvatar: auth.user.avatar ?? null,
      publishDate: new Date(),
      coverImage: data.coverImage?.trim() || null,
      tags: data.tags?.length ? JSON.stringify(data.tags) : "[]",
      type: data.type === "official" && isAdmin ? "official" : "personal",
      isVlog: Boolean(data.isVlog),
      videoUrl: data.videoUrl?.trim() || null,
      readTime: Number.isFinite(data.readTime) ? Number(data.readTime) : 3,
      likes: 0,
      // Admins auto-approve their own posts; everyone else awaits moderation.
      approvalStatus: isAdmin ? "approved" : "pending",
      approvedBy: isAdmin ? auth.user.name : null,
    },
  });

  return apiOk(
    {
      blog: {
        id: blog.id,
        title: blog.title,
        excerpt: blog.excerpt,
        approvalStatus: blog.approvalStatus,
        publishDate: blog.publishDate.toISOString(),
      },
    },
    { status: 201 },
  );
}
