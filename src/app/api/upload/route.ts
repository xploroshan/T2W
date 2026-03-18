import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// POST /api/upload - upload an image file (avatar, poster, etc.)
// Always stores as base64 data URL in the database for cross-device persistence.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null; // "avatar" | "poster" | "motorcycle"
    const targetId = formData.get("targetId") as string | null; // riderId or rideId

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const url = `data:${file.type};base64,${base64}`;

    // If this is an avatar upload, persist URL directly in RiderProfile
    if (type === "avatar" && targetId) {
      const canEdit =
        user.role === "superadmin" ||
        user.linkedRiderId === targetId ||
        user.id === targetId;

      if (canEdit) {
        await prisma.riderProfile.update({
          where: { id: targetId },
          data: { avatarUrl: url },
        });
      }
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[T2W] Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
