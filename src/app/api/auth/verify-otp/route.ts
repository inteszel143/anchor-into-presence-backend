import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ message: "Email and OTP required" }, { status: 400 });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (!user.otp || !user.otpExpiresAt) {
      return NextResponse.json({ message: "No OTP pending" }, { status: 400 });
    }

    if (user.otp !== otp || new Date() > user.otpExpiresAt) {
      return NextResponse.json({ message: "Invalid or expired OTP" }, { status: 400 });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    return NextResponse.json({
      message: "OTP verified",
      status: true,
      data: {},
    });
  } catch (err) {
    console.error("verify-otp error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}