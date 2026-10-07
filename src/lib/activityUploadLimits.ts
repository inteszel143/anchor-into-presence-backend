export const MEDIA_LIMIT_BYTES = 100 * 1024 * 1024;
export const IMAGE_LIMIT_BYTES = 10 * 1024 * 1024;
// Room for both files and multipart fields; must match next.config.ts.
export const REQUEST_LIMIT_BYTES = 112 * 1024 * 1024;
export const UPLOAD_LIMIT_MESSAGE = "Upload too large. Videos must be 100 MB or smaller and images 10 MB or smaller.";

export function activityFileSizeError(file: { size: number } | null | undefined, kind: "Video" | "Audio" | "Image"): string | null {
  const limit = kind === "Image" ? IMAGE_LIMIT_BYTES : MEDIA_LIMIT_BYTES;
  if (!file || file.size <= limit) return null;
  return `This ${kind.toLowerCase()} exceeds the ${kind === "Image" ? 10 : 100} MB limit. Please compress it or choose a smaller file.`;
}
