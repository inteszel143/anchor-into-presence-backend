import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Category } from '@/models/Category'
import mongoose from 'mongoose'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB()

  const { id } = await params
  if (!id) {
    return NextResponse.json({ message: 'Missing category ID' }, { status: 400 })
  }

  const deleted = await Category.findByIdAndDelete(id)
  if (!deleted) {
    return NextResponse.json({ message: 'Category not found' }, { status: 404 })
  }

  return NextResponse.json({ message: 'Category deleted successfully' }, { status: 200 })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB()

  const { id } = await params
  if (!id) {
    return NextResponse.json({ message: 'Missing category ID' }, { status: 400 })
  }

  const category = await Category.findById(id)
  if (!category) {
    return NextResponse.json({ message: 'Category not found', data: {}, status: false }, { status: 404 })
  }

  return NextResponse.json({ message: 'Category fetched successfully', category, status: true }, { status: 200 })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
  }
  const { name, description } = await req.json()

  if (!name || !description) {
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );
  }

  const updatePayload: any = {
    name,
    description,
  };

  const updated = await Category.findByIdAndUpdate(id, updatePayload, {
    new: true,
  });

  return NextResponse.json({
    message: "Category updated successfully",
    data: updated,
    status: true,
  });
}