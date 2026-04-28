/**
 * Vercel Blob upload helper.
 *
 * Used by /api/upload (live uploads from the browser) and by the one-shot
 * migration script in scripts/migrate-images-to-blob.ts. Both call paths
 * funnel through `uploadImage` so MIME-handling, filename generation, and
 * size validation stay in one place.
 *
 * Replaces the old "store base64 in Postgres" path that crashed iOS WebKit.
 */

import { put } from "@vercel/blob";

// Map a MIME type to a file extension. Limited to image types we accept.
const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/heic": "heic",
};

export interface UploadImageOptions {
  /** Logical bucket — used as the top-level folder in Blob (avatar, poster, …) */
  type: string;
  /** Optional second folder, typically the owning entity ID (riderId, rideId, …) */
  scope?: string;
  /** Optional content-type override; defaults to detected MIME */
  contentType?: string;
}

export interface UploadImageResult {
  url: string;
  pathname: string;
  contentType: string;
}

/**
 * Decode a `data:` URL into raw bytes + MIME type.
 * Throws if the input isn't a well-formed image data URL.
 */
export function decodeDataUrl(dataUrl: string): { bytes: Buffer; mime: string } {
  if (!dataUrl.startsWith("data:image/")) {
    throw new Error("Not an image data URL");
  }
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new Error("Malformed data URL");
  const header = dataUrl.slice(5, comma); // strip "data:" prefix
  const isBase64 = header.endsWith(";base64");
  const mime = isBase64 ? header.slice(0, -7) : header;
  const payload = dataUrl.slice(comma + 1);
  const bytes = isBase64
    ? Buffer.from(payload, "base64")
    : Buffer.from(decodeURIComponent(payload), "utf-8");
  return { bytes, mime };
}

/**
 * Upload an image to Vercel Blob and return its public URL.
 *
 * Accepts either a Web `File` (from a multipart form) or a `data:` URL string
 * (when the browser pre-compressed via canvas). Routes both through `put()`
 * with `addRandomSuffix: true` so concurrent uploads to the same logical
 * pathname never collide.
 */
export async function uploadImage(
  input: File | string,
  options: UploadImageOptions
): Promise<UploadImageResult> {
  let bytes: Buffer;
  let mime: string;

  if (typeof input === "string") {
    ({ bytes, mime } = decodeDataUrl(input));
  } else {
    const arrayBuf = await input.arrayBuffer();
    bytes = Buffer.from(arrayBuf);
    mime = input.type || "application/octet-stream";
  }

  const ext = MIME_EXT[mime] || "bin";
  const filename = options.scope
    ? `${options.type}/${options.scope}/${ext}`
    : `${options.type}/${ext}`;

  const result = await put(filename, bytes, {
    access: "public",
    contentType: options.contentType ?? mime,
    addRandomSuffix: true,
  });

  return {
    url: result.url,
    pathname: result.pathname,
    contentType: options.contentType ?? mime,
  };
}
