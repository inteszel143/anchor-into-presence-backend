import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import { apiErrorResponse } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  await connectDB();

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Missing fields" }, { status: 400 });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);

    const existing = await User.findOne({ email });
    if (existing) {
      existing.password = hashedPassword;
      await existing.save();

      return NextResponse.json({
        message: "Password reset successfully",
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
