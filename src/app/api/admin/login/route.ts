import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Admin } from "@/models/Admin";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: NextRequest) {
  await connectDB();
  const { email, password } = await req.json();

  const admin = await Admin.findOne({ email });
  if (!admin)
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 }
    );
  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch)
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 }
    );

  const token = jwt.sign({ adminId: admin._id, role: "admin" }, JWT_SECRET, {
    expiresIn: "7d",
  });

  const cookieStore = await cookies(); // ✅ await the cookies() call
  cookieStore.set("admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({
    message: "Login successful",
    admin: {
      name: admin.name,
      email: admin.email,
      image: admin.image,
    },
    token,
  });
}
