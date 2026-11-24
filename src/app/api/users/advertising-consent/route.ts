import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/getAuthUser';
import { AdConsent } from '@/models/Advertising';
export async function POST(req: NextRequest) {
  const { userId } = await getAuthUser(req);
  const body = await req.json();
  if (typeof body.allowed !== 'boolean' || (body.allowed &&
    (!['ios', 'android'].includes(body.platform) || typeof body.anonId !== 'string' ||
      !/^[A-Za-z0-9_-]{10,200}$/.test(body.anonId)))) {
    return Response.json({ error: 'Invalid consent' }, { status: 400 });
  }
  await connectDB();
  await AdConsent.init();
  await AdConsent.updateOne({ userId }, body.allowed ? { $set: {
    allowed: true, anonId: body.anonId, platform: body.platform,
    expiresAt: new Date(Date.now() + 30 * 86400000),
  } } : { $set: { allowed: false }, $unset: { anonId: 1, expiresAt: 1 } }, { upsert: true });
  return Response.json({ success: true });
}
