import { prisma } from "@/lib/db";
import { apiOk } from "@/lib/api/v1/errors";

export async function GET() {
  const guidelines = await prisma.guideline.findMany({ orderBy: { id: "asc" } });
  return apiOk({ guidelines });
}
