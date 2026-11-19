/** Shared by the admin query and its status display. */
export const ACTIVE_WINDOW_MS = 2 * 60 * 1000;
export const INACTIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function activeAppUserFilter(now: Date) {
  return {
    $and: [{ $or: [
      { presenceUntil: { $gt: now } },
      { presenceUntil: { $exists: false }, lastSeenAt: { $gt: new Date(now.getTime() - ACTIVE_WINDOW_MS) } },
    ] }],
    isBlocked: { $ne: true },
    deletionPending: { $ne: true },
  };
}

export function appPresence(lastSeenAt: string | null | undefined, now: number, blocked = false, presenceUntil?: string | null) {
  const timestamp = lastSeenAt ? Date.parse(lastSeenAt) : NaN;
  if (!Number.isFinite(timestamp)) return { active: false, label: "No activity recorded" };
  const elapsed = Math.max(0, now - timestamp);
  if (!blocked && (presenceUntil !== undefined ? Date.parse(presenceUntil ?? "") > now : elapsed < ACTIVE_WINDOW_MS)) return { active: true, label: "Active now" };
  const minutes = Math.floor(elapsed / 60000);
  let label: string;
  if (minutes < 1) label = "Just now";
  else if (minutes < 60) label = `${minutes} ${minutes === 1 ? "min" : "mins"} ago`;
  else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    label = `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  } else if (elapsed < INACTIVE_WINDOW_MS) {
    const days = Math.floor(minutes / 1440);
    label = `${days} ${days === 1 ? "day" : "days"} ago`;
  } else {
    const months = Math.floor(elapsed / INACTIVE_WINDOW_MS);
    label = `Offline · ${months} ${months === 1 ? "month" : "months"} ago`;
  }
  return { active: false, label };
}
