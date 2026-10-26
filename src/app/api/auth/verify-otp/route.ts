import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { PendingRegistration } from "@/models/PendingRegistration";
import { hashRegistrationOtp } from "@/lib/registrationVerification";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email: inputEmail, otp } = await req.json();
    const email = typeof inputEmail === "string" ? inputEmail.trim() : "";
    if (!email || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ status: false, message: "Email and a six-digit OTP are required" }, { status: 400 });
    }
    await connectDB();
    const pending = await PendingRegistration.findOne({ email });
    if (pending) {
      // TTL cleanup is asynchronous; enforce expiry and attempt limits in the query too.
      const attempt = await PendingRegistration.findOneAndUpdate({
        _id: pending._id, otpHash: pending.otpHash,
        otpExpiresAt: { $gt: new Date() }, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 },
      }, { $inc: { attempts: 1 } }, { new: true });
      if (!attempt || attempt.otpHash !== hashRegistrationOtp(otp)) {
        return NextResponse.json({ status: false, message: "Invalid or expired OTP. Request a new code if needed." }, { status: 400 });
      }
      const existing = await User.findOne({ email });
      if (existing?.isVerified) {
        return NextResponse.json({ status: false, message: "Email already registered. Please sign in." }, { status: 409 });
      }
      const verified = { name: attempt.name, email, password: attempt.password, isVerified: true, otp: null, otpExpiresAt: null };
      if (existing) {
        // Finish a legacy unverified signup without replacing a concurrently verified account.
        const updated = await User.findOneAndUpdate({ _id: existing._id, isVerified: false }, { $set: verified }, { new: true });
        if (!updated) return NextResponse.json({ status: false, message: "Email already registered. Please sign in." }, { status: 409 });
      } else {
        await User.create(verified);
      }
      await PendingRegistration.deleteOne({ _id: attempt._id, otpHash: attempt.otpHash });
    } else {
      // Retain password-recovery and pre-deployment verification-code compatibility.
      const user = await User.findOne({ email });
      if (!user || !user.otp || !user.otpExpiresAt || user.otp !== otp || new Date() >= user.otpExpiresAt) {
        return NextResponse.json({ status: false, message: "Invalid or expired OTP" }, { status: 400 });
      }
      user.isVerified = true;
      user.otp = null;
      user.otpExpiresAt = null;
      await user.save();
    }
    return NextResponse.json({ message: "OTP verified", status: true, data: {} });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return NextResponse.json({ status: false, message: "Email already registered. Please sign in." }, { status: 409 });
    }
    console.error("OTP verification could not be completed");
    return NextResponse.json({ status: false, message: "Verification is temporarily unavailable. Please try again." }, { status: 500 });
  }
}
