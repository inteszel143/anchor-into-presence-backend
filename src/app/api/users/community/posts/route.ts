import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthUser } from "@/lib/getAuthUser";
import { Posts, PostType } from "@/models/Posts";
import "@/models/User";
import { Reactions } from "@/models/Reactions";
import { uploadToS3 } from "@/lib/s3";

/**
 * POST /api/users/community/posts
 * Creates a new community post with optional image upload to AWS S3.
 */
export async function POST(req: NextRequest) {
  await connectDB();
  const { userId } = await getAuthUser(req);

  try {
    const formData = await req.formData();

    const message = formData.get("message") as string;
    const postType = formData.get("postType") as string;
    const postAnonymously = formData.get("postAnonymously");

    const maxImages = 1;

    // Get images (single or multiple)
    const images = formData.getAll("images");

    // Enforce image limit
    if (images.length > maxImages) {
      return NextResponse.json(
        {
          status: false,
          message: `You can upload only ${maxImages} image(s)`,
        },
        { status: 400 }
      );
    }

    // Upload images to S3
    const uploadedImagePaths: string[] = [];

    for (const img of images) {
      if (typeof img === "string") continue;

      const fileName = `${Date.now()}-${img.name}`;
      const imagePath = await uploadToS3(img as File, fileName);

      uploadedImagePaths.push(imagePath);
    }

    const newPost = {
      userId,
      message,
      postType,
      postAnonymously,
      images: uploadedImagePaths,
      createdAt: new Date(),
    };

    await Posts.create(newPost);

    return NextResponse.json({
      status: true,
      message: "Post added successfully",
      data: newPost,
    });
  } catch (error) {
    console.error("Post upload error:", error);
    return NextResponse.json(
      { status: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/users/community/posts
 * Retrieves paginated community posts with user information and reaction/like state.
 */
export async function GET(req: NextRequest) {
  await connectDB();
  const { userId } = await getAuthUser(req);

  try {
    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    // Fetch posts
    const posts = await Posts.find(filter)
      .populate("userId", "name email image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<PostType[]>();

    // Remove posts whose user no longer exists
    const filteredPosts = posts.filter(post => post.userId !== null);

    // Collect only valid post IDs
    const postIds = filteredPosts.map(p => p._id);

    // Fetch reactions for the current user
    const userReactions = await Reactions.find({
      targetType: "post",
      targetId: { $in: postIds },
      userId: userId,
      type: "like",
    }).lean();

    // Convert liked posts into a lookup set
    const likedPostIds = new Set(
      userReactions.map(r => r.targetId.toString())
    );

    // Attach "liked" field
    const finalPosts = filteredPosts.map(post => ({
      ...post,
      liked: likedPostIds.has(post._id.toString()),
    }));

    // Pagination total count matching valid user filter
    const totalPostsAgg = await Posts.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      { $count: "total" }
    ]);

    const totalPosts = totalPostsAgg[0]?.total || 0;

    return NextResponse.json({
      status: true,
      message: "Posts fetched successfully",
      data: finalPosts,
      pagination: {
        page,
        limit,
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit),
      },
    });
  } catch (error) {
    console.error("GET posts error:", error);
    return NextResponse.json(
      { status: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

