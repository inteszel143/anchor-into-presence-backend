import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { connectDB } from "@/lib/db";
import { presenceRevision } from "@/lib/presenceEvents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  let expiresAt: number;
  try {
    const secret = process.env.JWT_SECRET;
    const token = req.cookies.get("admin_session")?.value;
    if (!token || !secret) throw new Error("Unauthorized");
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (payload.role !== "admin") throw new Error("Unauthorized");
    // Rotate connections regularly to revalidate authorization, even for tokens without exp.
    expiresAt = Math.min(typeof payload.exp === "number" ? payload.exp * 1000 : Infinity, Date.now() + 300000);
  } catch {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const encoder = new TextEncoder();
  let stop = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let timer: ReturnType<typeof setTimeout>;
      let previous: string | undefined;
      let lastSync = 0;
      stop = () => {
        if (closed) return;
        closed = true;
        clearTimeout(timer);
        req.signal.removeEventListener("abort", stop);
        try { controller.close(); } catch { /* Already cancelled by the consumer. */ }
      };
      req.signal.addEventListener("abort", stop, { once: true });
      if (req.signal.aborted) { stop(); return; }
      controller.enqueue(encoder.encode("retry: 2000\n\n"));
      async function tick() {
        if (closed) return;
        if (Date.now() >= expiresAt) { stop(); return; }
        try {
          const revision = await presenceRevision();
          if (closed) return;
          // Initial/reconnect snapshots and periodic resync also handle expired sessions,
          // account moderation and a heartbeat accepted during a relay-write failure.
          if ((controller.desiredSize ?? 0) <= 0) { stop(); return; }
          if (revision !== previous || Date.now() - lastSync >= 15000) {
            controller.enqueue(encoder.encode(`event: presence\ndata: ${JSON.stringify({ revision })}\n\n`));
            previous = revision;
            lastSync = Date.now();
          }
        } catch {
          stop(); // EventSource retries; never present a broken relay as healthy.
          return;
        }
        timer = setTimeout(tick, 1000);
      }
      void tick();
    },
    cancel() { stop(); },
  }, { highWaterMark: 16 });
  return new Response(stream, { headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "private, no-store, no-transform",
    "X-Accel-Buffering": "no",
  } });
}
