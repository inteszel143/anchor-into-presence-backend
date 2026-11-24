import { OAuth2Client } from 'google-auth-library';
import { connectDB } from '@/lib/db';
import { enqueuePayment } from '@/lib/advertising/pipeline';
export const runtime = 'nodejs';
export async function POST(req: Request) {
  if (process.env.AD_MEASUREMENT_ENABLED !== 'true') return new Response(null, { status: 503 });
  const audience = process.env.GOOGLE_RTDN_AUDIENCE;
  const email = process.env.GOOGLE_RTDN_SERVICE_ACCOUNT_EMAIL;
  if (!audience || !email) return new Response(null, { status: 503 });
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer /, '');
    if (!token) return new Response(null, { status: 401 });
    const ticket = await new OAuth2Client().verifyIdToken({ idToken: token, audience });
    const identity = ticket.getPayload();
    if (identity?.email !== email || identity.email_verified !== true) return new Response(null, { status: 401 });
    const raw = await req.text();
    if (raw.length > 100000) return new Response(null, { status: 413 });
    const envelope = JSON.parse(raw);
    const message = JSON.parse(Buffer.from(envelope.message.data, 'base64').toString('utf8'));
    if (message.packageName !== process.env.GOOGLE_PLAY_PACKAGE_NAME) return new Response(null, { status: 400 });
    const sub = message.subscriptionNotification;
    if (!sub || ![1, 2, 4, 7].includes(sub.notificationType)) return new Response(null, { status: 204 });
    if (typeof sub.purchaseToken !== 'string' || sub.purchaseToken.length > 8192 || typeof envelope.message.messageId !== 'string') return new Response(null, { status: 400 });
    await connectDB();
    await enqueuePayment({ platform: 'android', purchaseToken: sub.purchaseToken, notificationId: envelope.message.messageId });
    return new Response(null, { status: 204 });
  } catch { return new Response(null, { status: 503 }); }
}
