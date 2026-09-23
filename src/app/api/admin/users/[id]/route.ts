import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User } from '@/models/User'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;

  const user = await User.findById(id)
  if (!user) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 })
  }

  user.isBlocked = !user.isBlocked
  await user.save()

  return NextResponse.json({ message: 'User updated', isBlocked: user.isBlocked })
}

export async function DELETE(req: NextRequest, context: any) {
  await connectDB();

  const { id } = context.params;

  const user = await User.findByIdAndDelete(id);

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "User deleted successfully" });
}
