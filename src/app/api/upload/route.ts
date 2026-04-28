import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { uploadImage } from "@/lib/blob-upload";

// POST /api/upload - upload an image (avatar, ride poster, blog cover, etc.)
//
// Stores the binary in Vercel Blob and returns a public CDN URL. The caller
// (or this handler, when type=avatar) persists the URL into the relevant
// model column. This replaces the legacy base64-in-Postgres scheme that
// was crashing iOS WebKit tabs once the cache grew past ~5 MB.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string | null) || "misc";
    const targetId = formData.get("targetId") as string | null;
    // Accept pre-compressed base64 data URL from the client (preferred for
    // avatars — the canvas compression in RiderProfilePage / RideDetailPage
    // already shrinks images aggressively before hitting the network).
    const dataUrl = formData.get("dataUrl") as string | null;

    if (!file && !dataUrl) {
      return NextResponse.json({ error: "No file or dataUrl provided" }, { status: 400 });
    }

    let url: string;

    if (dataUrl) {
      if (!dataUrl.startsWith("data:image/")) {
        return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
      }
      // 2 MB compressed limit — base64 expands ~4/3 so a 2 MB binary is ~2.73 MB string
      if (dataUrl.length > 2 * 1024 * 1024 * 1.4) {
        return NextResponse.json({ error: "Image must be under 2MB" }, { status: 400 });
      }
      const result = await uploadImage(dataUrl, {
        type,
        scope: targetId ?? user.id,
      });
      url = result.url;
    } else if (file) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
      }
      // 5 MB raw cap — large enough for an unmodified phone photo.
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 });
      }
      const result = await uploadImage(file, {
        type,
        scope: targetId ?? user.id,
      });
      url = result.url;
    } else {
      return NextResponse.json({ error: "No image data" }, { status: 400 });
    }

    // For avatar uploads, persist to the rider profile server-side so the
    // change is durable even if the client crashes between upload + save.
    if (type === "avatar" && targetId) {
      const canEdit =
        user.role === "superadmin" ||
        user.role === "core_member" ||
        user.linkedRiderId === targetId ||
        user.id === targetId;

      if (!canEdit) {
        return NextResponse.json(
          { error: "You don't have permission to update this profile picture" },
          { status: 403 }
        );
      }

      await prisma.riderProfile.update({
        where: { id: targetId },
        data: { avatarUrl: url },
      });

      return NextResponse.json({ url, persisted: true });
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[T2W] Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
