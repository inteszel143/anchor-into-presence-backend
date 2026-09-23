import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import { Posts } from "@/models/Posts";
import { Comments, CommentType } from "@/models/Comments";
import { getAuthUser } from "@/lib/getAuthUser";
import { Reactions } from "@/models/Reactions";


export async function POST(req: NextRequest, { params }: any) {
    await connectDB();

    try {
        const { userId } = await getAuthUser(req);
        const postId = params.postId;

        const { message, parentCommentId } = await req.json();

        if (!message) {
            return NextResponse.json(
                { status: false, message: "Message is required" },
                { status: 400 }
            );
        }

        // 1️⃣ Create comment
        const comment = await Comments.create({
            postId,
            userId,
            parentCommentId: parentCommentId || null,
            message,
        });

        // 2️⃣ Increment post comment count
        await Posts.updateOne(
            { _id: postId },
            { $inc: { commentsCount: 1 } }
        );

        // 3️⃣ If reply → increment parent comment reply count
        if (parentCommentId) {
            await Comments.updateOne(
                { _id: parentCommentId },
                { $inc: { repliesCount: 1 } }
            );
        }

        return NextResponse.json({
            status: true,
            message: "Comment added successfully",
            data: comment,
        });
    } catch (error) {
        console.error("COMMENT ADD ERROR:", error);
        return NextResponse.json(
            { status: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}


export async function GET(req: NextRequest, { params }: any) {
    await connectDB();

    try {
        const { userId } = await getAuthUser(req); // current logged in user
        const postId = params.postId;

        const searchParams = req.nextUrl.searchParams;
        const page = Number(searchParams.get("page")) || 1;
        const limit = Number(searchParams.get("limit")) || 20;
        const skip = (page - 1) * limit;

        // ---- 1. Fetch parent comments ----
        const parentComments = await Comments.find({
            postId,
            parentCommentId: null,
        })
            .populate("userId", "name image")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean<CommentType[]>();

        const parentIds = parentComments.map((c) => c._id);

        // ---- 2. Fetch replies ----
        const replies = await Comments.find({
            parentCommentId: { $in: parentIds },
        })
            .populate("userId", "name image")
            .sort({ createdAt: 1 })
            .lean<CommentType[]>();

        const replyIds = replies.map((r) => r._id);

        // ---- 3. Collect ALL comment IDs (parents + replies) ----
        const allCommentIds = [...parentIds, ...replyIds];

        // ---- 4. Fetch user's reactions for all these comments ----
        const userReacts = await Reactions.find({
            targetType: "comment",
            targetId: { $in: allCommentIds },
            userId,
        }).lean();

        // Put liked IDs into Set for fast lookup
        const likedIds = new Set(userReacts.map((r) => r.targetId.toString()));

        // ---- 5. Build reply map ----
        const replyMap: Record<string, any[]> = {};

        replies.forEach((reply) => {
            const parentId = reply.parentCommentId!.toString();
            reply.liked = likedIds.has(reply._id.toString());

            if (!replyMap[parentId]) replyMap[parentId] = [];
            replyMap[parentId].push(reply);
        });

        // ---- 6. Attach replies + liked flag to parents ----
        const result = parentComments.map((comment) => {
            const id = comment._id.toString();

            return {
                ...comment,
                liked: likedIds.has(id),
                replies: replyMap[id] || [],
            };
        });

        return NextResponse.json(
            {
                status: true,
                message: "Comments fetched successfully",
                page,
                limit,
                data: result,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("COMMENTS GET ERROR:", error);
        return NextResponse.json(
            {
                status: false,
                message: "Failed to fetch comments",
                error: error.message,
            },
            { status: 500 }
        );
    }
}


