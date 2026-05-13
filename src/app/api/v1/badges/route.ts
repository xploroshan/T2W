import { prisma } from "@/lib/db";
import { apiOk } from "@/lib/api/v1/errors";

export async function GET() {
  const badges = await prisma.badge.findMany({ orderBy: { minKm: "asc" } });
  return apiOk({ badges });
}
