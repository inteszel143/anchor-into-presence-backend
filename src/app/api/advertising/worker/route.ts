import { timingSafeEqual } from 'node:crypto';
import { connectDB } from '@/lib/db';
import { runAdvertisingWorker } from '@/lib/advertising/pipeline';
export const runtime = 'nodejs';
export const maxDuration = 300;
export async function POST(req: Request) {
  const expected = process.env.AD_WORKER_SECRET;
  const supplied = req.headers.get('authorization') ?? '';
  const target = `Bearer ${expected}`;
  const suppliedBytes = Buffer.from(supplied);
  const targetBytes = Buffer.from(target);
  if (!expected || suppliedBytes.length !== targetBytes.length || !timingSafeEqual(suppliedBytes, targetBytes)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try { await connectDB(); return Response.json(await runAdvertisingWorker(5)); }
  catch { return Response.json({ error: 'Advertising worker unavailable' }, { status: 503 }); }
}
