import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Category } from '@/models/Category'

export async function GET(req: NextRequest) {
  await connectDB()
  const categories = await Category.find({status: 1})

  return NextResponse.json({
    message: 'Categories fetched successfully',
    data: categories,
    status: true,
  })
}
