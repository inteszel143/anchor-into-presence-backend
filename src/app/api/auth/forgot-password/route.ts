import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { sendForgotPasswordEmail } from '@/lib/sendEmail'
import { apiErrorResponse } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  await connectDB();

  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "Missing fields" }, { status: 400 });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const existing = await User.findOne({ email });
    if (existing) {
      existing.otp = otp;
      existing.otpExpiresAt = otpExpiresAt;
      existing.resetPassword = true;
      await existing.save();
      await sendForgotPasswordEmail(email, otp);

      return NextResponse.json({
        message: "OTP sent to provided email",
        data: {},
        status: true,
      });
    } else {
      return NextResponse.json(
        {
          message: "email doesn't exists",
          data: {},
          status: false,
        },
        { status: 404 }
      );
    }
  } catch (err: any) {
    console.error("Error changing password:", err);
    return apiErrorResponse(err, { message: "Internal server error" });
  }
}
