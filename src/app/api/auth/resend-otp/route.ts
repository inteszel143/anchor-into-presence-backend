import { randomInt } from "node:crypto";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { PendingRegistration } from "@/models/PendingRegistration";
import { sendOtpEmail } from "@/lib/sendEmail";
import { sendRegistrationCode, VerificationEmailError } from "@/lib/registrationVerification";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email: inputEmail } = await req.json();
    const email = typeof inputEmail === "string" ? inputEmail.trim() : "";
    if (!email) return NextResponse.json({ status: false, message: "Email is required" }, { status: 400 });
    await connectDB();
    const pending = await PendingRegistration.findOne({ email });
    if (pending) {
      if (new Date() >= pending.expiresAt) {
        return NextResponse.json({ status: false, message: "Your signup has expired. Please create your account again." }, { status: 400 });
      }
      const existing = await User.findOne({ email });
      if (existing?.isVerified) return NextResponse.json({ status: false, message: "Email already registered. Please sign in." }, { status: 409 });
      await sendRegistrationCode({ email, name: pending.name, password: pending.password });
    } else {
      const user = await User.findOne({ email });
      if (!user) return NextResponse.json({ status: false, message: "Please create your account again to request a code." }, { status: 400 });
      const otp = randomInt(100000, 1000000).toString();
      try { await sendOtpEmail(email, otp); } catch { throw new VerificationEmailError(); }
      user.otp = otp;
      user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
    }
    return NextResponse.json({ message: "OTP resent to email", status: true, data: {} });
  } catch (error) {
    const mailFailed = error instanceof VerificationEmailError;
    return NextResponse.json({ status: false, message: mailFailed ? "We couldn’t send your verification email. Please try again shortly." : "Unable to resend your code right now. Please try again." }, { status: mailFailed ? 503 : 500 });
  }
}
