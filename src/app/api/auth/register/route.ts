import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { sendOtpEmail } from "@/lib/sendEmail";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  await connectDB();
  const { name, email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json(
      { message: "All fields required" },
      { status: 400 }
    );
  }

  const existing = await User.findOne({ email });
  if (existing && existing.isVerified) {
    return NextResponse.json(
      { message: "Email already registered" },
      { status: 409 }
    );
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  const hashedPassword = await bcrypt.hash(password, 10);

  if (existing) {
    // Update existing unverified user
    existing.name = name;
    existing.password = hashedPassword;
    existing.otp = otp;
    existing.otpExpiresAt = otpExpiresAt;
    await existing.save();
  } else {
    await User.create({
      name,
      email,
      password: hashedPassword,
      otp,
      otpExpiresAt,
    });
  }

  await sendOtpEmail(email, otp);

  return NextResponse.json({
    message: "OTP sent to email",
    status: true,
    data: {},
  });
}
