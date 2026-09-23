import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { login_medium, email, social_id, fcmToken, name } = await req.json();

    // Validate required fields
    if (!login_medium || !email || !social_id) {
      return NextResponse.json(
        { message: "All fields (login_medium, email, social_id) are required!" },
        { status: 400 }
      );
    }

    // Validate login_medium
    const validMediums = ["google", "apple"];
    const normalizedMedium = login_medium.toLowerCase();
    if (!validMediums.includes(normalizedMedium)) {
      return NextResponse.json(
        { message: "Invalid login_medium! Must be 'google' or 'apple'." },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Invalid email format!" },
        { status: 400 }
      );
    }

    // Check for existing user
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      // Verify login medium matches for existing user
      if (existingUser.provider !== normalizedMedium) {
        return NextResponse.json(
          { message: `This email is already registered with ${existingUser.provider} login` },
          { status: 400 }
        );
      }

      // Prepare updates
      // Push registration is optional; it must never block authentication.
      const updates: { fcmToken?: string; name?: string } = {};
      if (typeof fcmToken === "string" && fcmToken.trim()) {
        updates.fcmToken = fcmToken;
      }
      if (name && name !== existingUser.name) {
        updates.name = name;
      }

      // Update user if needed
      if (Object.keys(updates).length > 0) {
        await User.findByIdAndUpdate(existingUser._id, updates);
        if (updates.name) existingUser.name = name;
      }

      const token = jwt.sign(
        { userId: existingUser._id, email: existingUser.email, role: "user" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const response = NextResponse.json({
        message: "Social login successful!",
        data: {
          name: existingUser.name, 
          email: existingUser.email,
          fcmToken: existingUser.fcmToken,
          token:token
        },
      });

      response.cookies.set("user_session", token, {
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    } else {
      // Create new user with name from social provider (if provided)
      const newUser = await User.create({
        name: name || email.split('@')[0], // Use provided name or fallback to email prefix
        email,
        [normalizedMedium === 'google' ? 'googleId' : 'appleId']: social_id,
        provider: normalizedMedium,
        fcmToken,
        isVerified: true
      });

      const token = jwt.sign(
        { userId: newUser._id, email: newUser.email, role: "user" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const response = NextResponse.json({
        message: "Social login successful!",
        data: {
          name: newUser.name, 
          email: newUser.email,
          fcmToken:fcmToken,
          token:token
        },
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
  } catch (error) {
    console.error("Social login error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to process social login" },
      { status: 500 }
    );
  }
}