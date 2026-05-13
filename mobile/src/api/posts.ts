import { apiFetch } from "./client";

export type RidePost = {
  id: string;
  rideId: string;
  authorId: string | null;
  authorName: string;
  content: string;
  images: string[];
  approvalStatus: "pending" | "approved" | "rejected";
  approvedBy: string | null;
  createdAt: string;
};

export async function listRidePosts(opts: {
  rideId?: string;
  status?: "pending" | "approved" | "rejected";
  cursor?: string;
  limit?: number;
} = {}) {
  return apiFetch<{ items: RidePost[]; nextCursor: string | null }>("/api/v1/ride-posts", {
    query: { rideId: opts.rideId, status: opts.status, cursor: opts.cursor, limit: opts.limit },
  });
}

export async function createRidePost(body: {
  rideId: string;
  content: string;
  images?: string[];
}) {
  return apiFetch<{ post: RidePost }>("/api/v1/ride-posts", {
    method: "POST",
    body,
  });
}

export async function moderateRidePost(id: string, approvalStatus: "approved" | "rejected") {
  return apiFetch<{ post: RidePost }>(`/api/v1/ride-posts/${id}`, {
    method: "PATCH",
    body: { approvalStatus },
  });
}

export type CreateBlogBody = {
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  tags?: string[];
  isVlog?: boolean;
  videoUrl?: string;
  readTime?: number;
};

export async function createBlog(body: CreateBlogBody) {
  return apiFetch<{ blog: { id: string; approvalStatus: string } }>("/api/v1/blogs", {
    method: "POST",
    body,
  });
}

export async function sendContact(subject: string, message: string) {
  return apiFetch<{ success: true }>("/api/v1/contact", {
    method: "POST",
    body: { subject, message },
  });
}
