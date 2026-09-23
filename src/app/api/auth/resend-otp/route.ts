import { connectDB } from '@/lib/db'
import { User } from '@/models/User'
import { sendOtpEmail } from '@/lib/sendEmail'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  await connectDB()
  const { email } = await req.json()

  const user = await User.findOne({ email })
  if (!user) {
    return NextResponse.json({ message: 'Invalid user' }, { status: 400 })
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  user.otp = otp
  user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000)
  await user.save()

  await sendOtpEmail(email, otp)

  return NextResponse.json({ message: 'OTP resent to email', status: true, data: {} })
}
