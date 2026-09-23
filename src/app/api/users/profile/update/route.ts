import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getUserFromRequest } from '@/lib/getUserFromRequest'
import { User } from '@/models/User'
import { uploadToS3 } from '@/lib/s3'

export const config = {
  api: {
    bodyParser: false,
  },
}

export async function PATCH(req: NextRequest) {
  await connectDB()

  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()

  const name = formData.get('name') as string | null
  const file = formData.get('image') as File | null

  let imagePath: string | undefined

  if (file && file.size > 0) {
    const filename = `${Date.now()}_${file.name}`
    imagePath = await uploadToS3(file, filename)
  }

  const updated = await User.findByIdAndUpdate(
    user.userId,
    {
      ...(name && { name }),
      ...(imagePath && { image: imagePath }),
    },
    { new: true }
  ).select('-password')

  return NextResponse.json({
    message: 'Profile updated successfully',
    data: updated,
    status: true,
  })
}
