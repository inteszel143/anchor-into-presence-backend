import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Posts } from "@/models/Posts";
import "@/models/User";
import { apiErrorResponse } from "@/lib/apiResponse";

export async function GET(
  req: NextRequest,
   { params }: any
) {
  await connectDB();

  try {
    const shareId = params.shareId;

    if (!shareId) {
      return NextResponse.json(
        { status: false, message: "Missing shareId" },
        { status: 400 }
      );
    }

    // Find post by **public shareId**
    const post = await Posts.findOne({ shareId })
      .populate("userId", "name email image")
      .lean();

    if (!post) {
      return NextResponse.json(
        { status: false, message: "Invalid or expired link" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: true,
      message: "Post fetched successfully",
      data: post,
    });
  } catch (error: any) {
    console.error("SHARE POST ERROR:", error);
    return apiErrorResponse(error, { message: "Server error" });
  }
}
