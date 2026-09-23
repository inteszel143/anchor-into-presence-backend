import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Category } from '@/models/Category';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();

  const { id } = await params;
  const { status } = await req.json();

  if (typeof status !== 'number') {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }

  const updated = await Category.findByIdAndUpdate(id, { status }, { new: true });

  if (!updated) {
    return NextResponse.json({ message: "Activity not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Status updated", data: updated });
}
