import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { sendRegistrationCode, VerificationEmailError } from "@/lib/registrationVerification";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { name, email: inputEmail, password } = await req.json();
    const email = typeof inputEmail === "string" ? inputEmail.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== "string" || !password.trim() || (name != null && typeof name !== "string")) {
      return NextResponse.json({ status: false, message: "A valid email and password are required" }, { status: 400 });
    }
    await connectDB();
    const existing = await User.findOne({ email });
    if (existing?.isVerified) {
      return NextResponse.json({ status: false, message: "Email already registered" }, { status: 409 });
    }
    await sendRegistrationCode({ email, name: name?.trim(), password: await bcrypt.hash(password, 10) });
    return NextResponse.json({ message: "OTP sent to email", status: true, data: {} });
  } catch (error) {
    if (error instanceof VerificationEmailError) {
      return NextResponse.json({ status: false, message: "We couldn’t send your verification email. Please try creating your account again shortly." }, { status: 503 });
    }
    console.error("Registration could not be completed");
    return NextResponse.json({ status: false, message: "Account creation is temporarily unavailable. Please try again later." }, { status: 500 });
  }
}
