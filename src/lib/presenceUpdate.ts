import { ACTIVE_WINDOW_MS } from "./appPresence";

export type PresenceSignal = { sessionId: string; sequence: number; active: boolean };
export function parsePresenceSignal(body: unknown): PresenceSignal | null {
  if (!body || typeof body !== "object") return null;
  const value = body as PresenceSignal;
  return typeof value.sessionId === "string" && /^[a-zA-Z0-9-]{16,80}$/.test(value.sessionId)
    && Number.isSafeInteger(value.sequence) && value.sequence >= 0 && typeof value.active === "boolean"
    ? { sessionId: value.sessionId, sequence: value.sequence, active: value.active } : null;
}

// One atomic user-document update: another device cannot overwrite this session.
// Keep recently closed sessions as tombstones so delayed requests cannot reopen them.
export function presenceUpdate(signal: PresenceSignal, now: Date) {
  const expiresAt = new Date(now.getTime() + ACTIVE_WINDOW_MS);
  return [
    { $set: { presenceSessions: { $concatArrays: [
      { $filter: { input: { $ifNull: ["$presenceSessions", []] }, as: "session", cond: { $and: [
        { $ne: ["$$session.sessionId", signal.sessionId] },
        { $gt: ["$$session.lastSeenAt", new Date(now.getTime() - 86400000)] },
      ] } } },
      [{ ...signal, lastSeenAt: now, expiresAt }],
    ] }, lastSeenAt: { $max: ["$lastSeenAt", now] } } },
    { $set: { presenceUntil: { $max: [
      { $ifNull: ["$legacyPresenceUntil", new Date(0)] },
      { $max: { $map: { input: "$presenceSessions", as: "session",
        in: { $cond: ["$$session.active", "$$session.expiresAt", new Date(0)] } } } },
    ] } } },
  ];
}
