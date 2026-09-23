import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Category } from '@/models/Category'

export async function GET(req: NextRequest) {
  await connectDB()

  const { searchParams } = req.nextUrl

  let page = parseInt(searchParams.get('page') || '1', 10)
  if (isNaN(page) || page < 1) page = 1
  let limit = parseInt(searchParams.get('limit') || '10', 10)
  if (isNaN(limit) || limit < 1) limit = 10
  const query = searchParams.get('search') || ''

  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1
  const skip = (page - 1) * limit

  // Optional search by category name
  const filter = query
    ? { name: { $regex: query, $options: 'i' } }
    : {}

  const [categories, total] = await Promise.all([
    Category.find(filter)
      .sort({ [sortBy]: sortOrder }) // ✅ dynamic sorting
      .skip(skip)
      .limit(limit),
    Category.countDocuments(filter),
  ])

  const totalPages = Math.ceil(total / limit)

  return NextResponse.json({
    message: 'Categories fetched successfully',
    data: categories,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
    status: true,
  })
}
