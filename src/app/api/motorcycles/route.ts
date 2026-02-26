import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { success, error } from "@/lib/api";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return error("Unauthorized", 401);

    const motorcycles = await prisma.motorcycle.findMany({
      where: { userId: currentUser.id },
    });

    return success({ motorcycles });
  } catch (err) {
    console.error("Motorcycles list error:", err);
    return error("Failed to fetch motorcycles", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return error("Unauthorized", 401);

    const body = await request.json();
    const { make, model, year, cc, color, nickname, imageUrl } = body;

    if (!make || !model) {
      return error("Make and model are required");
    }

    const motorcycle = await prisma.motorcycle.create({
      data: {
        make,
        model,
        year: year || new Date().getFullYear(),
        cc: cc || 0,
        color: color || "Unknown",
        nickname: nickname || null,
        imageUrl: imageUrl || null,
        userId: currentUser.id,
      },
    });

    return success({ motorcycle }, 201);
  } catch (err) {
    console.error("Motorcycle create error:", err);
    return error("Failed to add motorcycle", 500);
  }
}
