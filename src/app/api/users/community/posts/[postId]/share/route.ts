import { NextRequest, NextResponse } from "next/server";
import { Posts } from "@/models/Posts";
import { connectDB } from "@/lib/db";
import { getAuthUser } from "@/lib/getAuthUser";
import { apiErrorResponse } from "@/lib/apiResponse";

export async function POST(req: NextRequest, { params }: any) {
  try {
    await connectDB();
    const user = await getAuthUser(req);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;

    const post = await Posts.findById(id);
    if (!post) {
      return NextResponse.json(
        { success: false, message: "Post not found" },
        { status: 404 }
      );
    }

    post.shareCount = (post.shareCount || 0) + 1;
    await post.save();

    return NextResponse.json(
      {
        success: true, message: "Post shared",
        data: { shareCount: post.shareCount },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return apiErrorResponse(error, { message: "Failed to share post" });
  }
}
