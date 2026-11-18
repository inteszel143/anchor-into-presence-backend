import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getUserFromRequest } from "@/lib/getUserFromRequest";
import { User } from "@/models/User";
import { apiErrorResponse } from "@/lib/apiResponse";

import { ACTIVE_WINDOW_MS } from "@/lib/appPresence";
import { parsePresenceSignal, presenceUpdate } from "@/lib/presenceUpdate";
import { publishPresenceChange } from "@/lib/presenceEvents";

const headers = { "Cache-Control": "private, no-store" };

/** Foreground heartbeat. Identity and time are never accepted from the body. */
export async function POST(req: NextRequest) {
  try {
    const identity = await getUserFromRequest(req);
    if (!identity || identity.role !== "user" || typeof identity.userId !== "string" || !mongoose.isValidObjectId(identity.userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers });
    }
    await connectDB();
    const now = new Date();
    const raw = await req.text();
    let body: unknown;
    try { body = raw ? JSON.parse(raw) : null; } catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400, headers }); }
    const signal = parsePresenceSignal(body);
    if (raw && !signal) return NextResponse.json({ message: "Invalid presence signal" }, { status: 400, headers });
    const filter = { _id: identity.userId, isBlocked: { $ne: true }, deletionPending: { $ne: true } };
    const result = signal
      ? await User.updateOne({ ...filter, presenceSessions: { $not: { $elemMatch: {
          sessionId: signal.sessionId, sequence: { $gte: signal.sequence },
        } } } }, presenceUpdate(signal, now), { timestamps: false })
      : await User.updateOne(filter, { $max: { lastSeenAt: now,
          legacyPresenceUntil: new Date(now.getTime() + ACTIVE_WINDOW_MS),
          presenceUntil: new Date(now.getTime() + ACTIVE_WINDOW_MS) } }, { timestamps: false });
    if (!result.matchedCount) {
      if (signal && await User.exists(filter)) return NextResponse.json({ ignored: true }, { headers });
      return NextResponse.json({ message: "Account unavailable" }, { status: 403, headers });
    }
    // A relay failure must not undo an accepted heartbeat; periodic resync repairs it.
    try { await publishPresenceChange(); } catch (error) { console.error("Presence relay unavailable", error); }
    return NextResponse.json({ lastSeenAt: now.toISOString() }, { headers });
  } catch (error) {
    return apiErrorResponse(error, { message: "Could not record app activity." });
  }
}
