import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Support } from '@/models/Support';

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;

  const support = await Support.findById(id)
  if (!support) {
    return NextResponse.json({ message: 'SupportId not found' }, { status: 404 })
  }

  support.status = 1
  await support.save()

  return NextResponse.json({ message: 'Support status updated' })
}

export async function DELETE(req: NextRequest, context: any) {
  await connectDB();

  const { id } = context.params;

  const user = await Support.findByIdAndDelete(id);

  if (!user) {
    return NextResponse.json({ message: "SupportId not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Support ticket deleted successfully" });
}
