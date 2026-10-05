export function isDailyPauseCategory(name?: string | null): boolean {
  return /^daily pauses?$/.test(name?.trim().toLowerCase() || "");
}

type ActivityMedia = {
  thumbnail?: string | null;
  video?: string | null;
  contentType?: string | null;
  taggedCategories?: { name: string }[];
  taggedCategoriesData?: { name: string }[];
};

export function getActivityImage(activity: ActivityMedia): string {
  const categories = activity.taggedCategories ?? activity.taggedCategoriesData ?? [];
  if (!categories.some(category => isDailyPauseCategory(category.name))) return "";
  // Existing pauses use thumbnail, including records still labelled Video.
  if (activity.thumbnail) return activity.thumbnail;
  // Support older records that stored an image in the media field.
  if (activity.contentType?.toLowerCase() === "image" ||
      /\.(png|jpe?g|webp|gif|avif)(?:[?#]|$)/i.test(activity.video || "")) {
    return activity.video || "";
  }
  return "";
}
