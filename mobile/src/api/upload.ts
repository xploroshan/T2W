import { apiBaseUrl, getAccessToken } from "./client";

export type UploadType =
  | "avatar"
  | "ride-poster"
  | "blog-cover"
  | "ride-post"
  | "payment-proof"
  | "motorcycle"
  | "misc";

/**
 * Upload a local image (file URI from expo-image-picker / camera) to the
 * backend. Returns the public CDN URL. Uses multipart so the binary doesn't
 * round-trip through base64 — important for the 3-5 MB phone-camera photos
 * common for payment proof.
 */
export async function uploadImage(
  uri: string,
  type: UploadType,
  opts: { targetId?: string; filename?: string; mime?: string } = {},
): Promise<string> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const form = new FormData();
  // React Native FormData accepts the legacy { uri, name, type } shape.
  form.append("file", {
    uri,
    name: opts.filename ?? `upload-${Date.now()}.jpg`,
    type: opts.mime ?? "image/jpeg",
  } as unknown as Blob);
  form.append("type", type);
  if (opts.targetId) form.append("targetId", opts.targetId);

  const res = await fetch(`${apiBaseUrl}/api/v1/upload`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.error?.message ?? `Upload failed (${res.status})`;
    throw new Error(message);
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}
