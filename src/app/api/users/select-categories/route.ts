import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthUser } from "@/lib/getAuthUser";
import { User } from "@/models/User";
import { apiErrorResponse } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { userId } = await getAuthUser(req);
    const body = await req.json();
    const { mood } = body;

    // Upsert user category selections
    const updated = await User.findByIdAndUpdate(
      userId,
      { userMood: mood },
      { new: true }
    );

    return NextResponse.json({
      message: "Categories saved successfully",
      data: {},
      status: true,
    });
  } catch (error) {
    console.error("Error saving user selected categories:", error);
    return apiErrorResponse(error, { message: "Internal Server Error" });
  }
}
