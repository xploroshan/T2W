import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { uploadImage } from "@/lib/blob-upload";
import { apiError, apiOk } from "@/lib/api/v1/errors";
import { requireBearer, isAdminRole } from "@/lib/api/v1/auth-guard";

/**
 * POST /api/v1/upload
 *
 * Multipart upload. Form fields:
 *   - file:     binary image (preferred from mobile — multipart streams)
 *   - dataUrl:  base64 data URL fallback
 *   - type:     "avatar" | "ride-poster" | "blog-cover" | "ride-post" |
 *               "payment-proof" | "motorcycle" | "misc"
 *   - targetId: scope id (e.g. rider profile id when type=avatar)
 *
 * Returns: { url }
 */
export async function POST(req: NextRequest) {
  const auth = await requireBearer(req);
  if (!auth.ok) return apiError("UNAUTHORIZED", "Authentication required");

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError("BAD_REQUEST", "Expected multipart/form-data");
  }

  const file = formData.get("file") as File | null;
  const type = (formData.get("type") as string | null) || "misc";
  const targetId = formData.get("targetId") as string | null;
  const dataUrl = formData.get("dataUrl") as string | null;

  if (!file && !dataUrl) {
    return apiError("BAD_REQUEST", "Provide either file or dataUrl");
  }

  let url: string;
  try {
    if (dataUrl) {
      if (!dataUrl.startsWith("data:image/")) {
        return apiError("BAD_REQUEST", "Invalid image format");
      }
      if (dataUrl.length > 2 * 1024 * 1024 * 1.4) {
        return apiError("BAD_REQUEST", "Image must be under 2MB compressed");
      }
      url = (await uploadImage(dataUrl, { type, scope: targetId ?? auth.user.id })).url;
    } else if (file) {
      if (!file.type.startsWith("image/")) {
        return apiError("BAD_REQUEST", "Only image files are allowed");
      }
      if (file.size > 5 * 1024 * 1024) {
        return apiError("BAD_REQUEST", "File must be under 5MB");
      }
      url = (await uploadImage(file, { type, scope: targetId ?? auth.user.id })).url;
    } else {
      return apiError("BAD_REQUEST", "No image data");
    }
  } catch (err) {
    console.error("[T2W][v1] upload error:", err);
    return apiError("SERVER_ERROR", "Failed to upload file");
  }

  if (type === "avatar" && targetId) {
    const canEdit =
      isAdminRole(auth.user.role) ||
      auth.user.linkedRiderId === targetId ||
      auth.user.id === targetId;
    if (!canEdit) {
      return apiError("FORBIDDEN", "You don't have permission to update this profile picture");
    }
    await prisma.riderProfile.update({
      where: { id: targetId },
      data: { avatarUrl: url },
    });
    return apiOk({ url, persisted: true });
  }

  return apiOk({ url });
}
