import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserLoginStreak } from "@/models/UserLoginStreak";
import {
  startOfDay,
  differenceInCalendarDays,
} from "date-fns";
import mongoose from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: NextRequest) {
  await connectDB();

  const { email, password, fcmToken } = await req.json();
  if (!email || !password) {
    return NextResponse.json(
      { message: "Email and password are required" },
      { status: 400 }
    );
  }

  const user = await User.findOne({ email });
  if (!user || !user.password) {
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 }
    );
  }
  if (!user || !user.isVerified) {
    return NextResponse.json(
      { message: "Verify account first" },
      { status: 401 }
    );
  }

    if (!user || user.isBlocked === true) {
    return NextResponse.json(
      { message: "Account disabled contact admin" },
      { status: 401 }
    );
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 }
    );
  }

  const token = jwt.sign(
    { userId: user._id, email: user.email, role: "user" },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
  let isFirst = await updateUserLoginDate(user._id);

  await User.findByIdAndUpdate(user._id, { fcmToken }, { new: true });
  const response = NextResponse.json({
    message: "Login successful",
    data: { name: user.name, email: user.email, image: user.image?? '' },
    token,
    isFirst
  });

  response.cookies.set("user_session", token, {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}

const updateUserLoginDate = async (
  userId: string | mongoose.Types.ObjectId
) => {
  const user = await UserLoginStreak.findOne({userId});
  if (!user) {
    const today = startOfDay(new Date());
    const loginDates = [today];

    await UserLoginStreak.create({ userId, loginDates });
    return true
  } else {
    const today = startOfDay(new Date());

    if (user.loginDates.length === 0) {
      // First login ever
      user.loginDates = [today];
      await user.save();
      return;
    }

    const lastLogin = startOfDay(
      new Date(user.loginDates[user.loginDates.length - 1])
    );
    const diff = differenceInCalendarDays(today, lastLogin);

    if (diff === 1) {
      // Continues streak
      user.loginDates.push(today);
    } else {
      // Break in streak – reset to just today
      user.loginDates = [today];
    }
    await user.save();
    return false
  }
};
