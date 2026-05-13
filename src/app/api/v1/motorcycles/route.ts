import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer } from "@/lib/api/v1/auth-guard";

export async function GET(req: NextRequest) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");

  const motorcycles = await prisma.motorcycle.findMany({
    where: { userId: auth.user.id },
    orderBy: { id: "asc" },
  });
  return apiOk({ motorcycles });
}

type CreateBody = {
  make?: string;
  model?: string;
  year?: number;
  cc?: number;
  color?: string;
  nickname?: string;
  imageUrl?: string;
};

export async function POST(req: NextRequest) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");

  const body = (await req.json()) as CreateBody;
  if (!body.make?.trim() || !body.model?.trim()) {
    return apiError("BAD_REQUEST", "make and model are required");
  }

  const motorcycle = await prisma.motorcycle.create({
    data: {
      make: body.make.trim(),
      model: body.model.trim(),
      year: Number(body.year) || new Date().getFullYear(),
      cc: Number(body.cc) || 0,
      color: body.color ?? "",
      nickname: body.nickname?.trim() || null,
      imageUrl: body.imageUrl?.trim() || null,
      userId: auth.user.id,
    },
  });
  return apiOk({ motorcycle }, { status: 201 });
}
