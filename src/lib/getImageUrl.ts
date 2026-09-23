const CLOUDFRONT_DOMAIN = (process.env.NEXT_PUBLIC_CLOUDFRONT_URL || process.env.Cloudfront_URL || "d1ckq51qwp5orx.cloudfront.net")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

const CLOUDFRONT_URL = `https://${CLOUDFRONT_DOMAIN}`;

/**
 * Normalizes an image or media path to its full URL.
 * If given `/uploads/filename`, returns `https://d1ckq51qwp5orx.cloudfront.net/uploads/filename`.
 */
export function getImageUrl(path?: string | null): string {
  if (!path) return "";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  ) {
    return path;
  }

  if (path.startsWith("/uploads/")) {
    return `${CLOUDFRONT_URL}${path}`;
  }

  if (path.startsWith("uploads/")) {
    return `${CLOUDFRONT_URL}/${path}`;
  }

  return path;
}
