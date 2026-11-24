import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import { AdJob, AdPayment } from '@/models/Advertising';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    const token = req.cookies.get('admin_session')?.value;
    if (!token || !process.env.JWT_SECRET) throw new Error();
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || payload.role !== 'admin') throw new Error();
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers }); }
  try {
    await connectDB();
    const [jobs, payments, recent] = await Promise.all([
      AdJob.aggregate([{ $group: { _id: '$state', count: { $sum: 1 } } }]),
      AdPayment.aggregate([{ $group: { _id: { state: '$state', plan: '$plan', currency: '$currency', production: '$production' }, count: { $sum: 1 }, value: { $sum: '$value' } } }]),
      AdPayment.find().select('key platform productId plan value currency purchasedAt renewal production state error').sort({ createdAt: -1 }).limit(100).lean(),
    ]);
    return NextResponse.json({ jobs, payments, recent }, { headers });
  } catch { return NextResponse.json({ error: 'Measurement report unavailable' }, { status: 503, headers }); }
}
