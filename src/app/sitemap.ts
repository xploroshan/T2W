import { MetadataRoute } from "next";
import { mockRides, mockBlogs } from "@/data/mock";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://taleson2wheels.com";

  // Upcoming rides get highest priority for SEO
  const rideUrls = mockRides.map((ride) => ({
    url: `${baseUrl}/ride/${ride.id}`,
    lastModified: ride.status === "upcoming" ? new Date() : new Date(ride.startDate),
    changeFrequency: (ride.status === "upcoming" ? "daily" : "monthly") as "daily" | "monthly",
    priority: ride.status === "upcoming" ? 1.0 : 0.6,
  }));

  const blogUrls = mockBlogs.map((blog) => ({
    url: `${baseUrl}/blog/${blog.id}`,
    lastModified: new Date(blog.publishDate),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/rides`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blogs`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/guidelines`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...rideUrls,
    ...blogUrls,
  ];
}
