import { readFile } from 'node:fs/promises';
import { Environment, SignedDataVerifier } from '@apple/app-store-server-library';
import { connectDB } from '@/lib/db';
import { enqueuePayment } from '@/lib/advertising/pipeline';
export const runtime = 'nodejs';
export async function POST(req: Request) {
  if (process.env.AD_MEASUREMENT_ENABLED !== 'true') return new Response(null, { status: 503 });
  try {
    const paths = process.env.APPLE_ROOT_CERT_PATHS?.split(',').filter(Boolean);
    const bundle = process.env.APPLE_BUNDLE_ID;
    const appId = Number(process.env.APPLE_APP_ID);
    const sandbox = process.env.AD_STORE_ENVIRONMENT === 'sandbox';
    if (!paths?.length || !bundle || (!sandbox && !appId)) return new Response(null, { status: 503 });
    const verifier = new SignedDataVerifier(await Promise.all(paths.map(p => readFile(p.trim()))), true,
      sandbox ? Environment.SANDBOX : Environment.PRODUCTION, bundle, sandbox ? undefined : appId);
    const raw = await req.text();
    if (raw.length > 100000) return new Response(null, { status: 413 });
    const { signedPayload } = JSON.parse(raw);
    const notification = await verifier.verifyAndDecodeNotification(signedPayload);
    if (!['SUBSCRIBED', 'DID_RENEW'].includes(notification.notificationType ?? '')) return new Response(null, { status: 200 });
    if (!notification.data?.signedTransactionInfo) return new Response(null, { status: 400 });
    const t = await verifier.verifyAndDecodeTransaction(notification.data.signedTransactionInfo);
    await connectDB();
    await enqueuePayment({ platform: 'ios', transactionId: t.transactionId });
    return new Response(null, { status: 200 });
  } catch { return new Response(null, { status: 503 }); }
}
