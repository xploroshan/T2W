import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer } from "@/lib/api/v1/auth-guard";

type UpdateBody = {
  make?: string;
  model?: string;
  year?: number;
  cc?: number;
  color?: string;
  nickname?: string | null;
  imageUrl?: string | null;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");
  const { id } = await params;

  const existing = await prisma.motorcycle.findUnique({ where: { id } });
  if (!existing || existing.userId !== auth.user.id) {
    return apiError("NOT_FOUND", "Motorcycle not found");
  }

  const body = (await req.json()) as UpdateBody;
  const motorcycle = await prisma.motorcycle.update({
    where: { id },
    data: {
      ...(body.make !== undefined ? { make: body.make.trim() } : {}),
      ...(body.model !== undefined ? { model: body.model.trim() } : {}),
      ...(body.year !== undefined ? { year: Number(body.year) } : {}),
      ...(body.cc !== undefined ? { cc: Number(body.cc) } : {}),
      ...(body.color !== undefined ? { color: body.color } : {}),
      ...(body.nickname !== undefined ? { nickname: body.nickname?.trim() || null } : {}),
      ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl?.trim() || null } : {}),
    },
  });
  return apiOk({ motorcycle });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");
  const { id } = await params;

  const existing = await prisma.motorcycle.findUnique({ where: { id } });
  if (!existing || existing.userId !== auth.user.id) {
    return apiError("NOT_FOUND", "Motorcycle not found");
  }
  await prisma.motorcycle.delete({ where: { id } });
  return apiOk({ success: true });
}
