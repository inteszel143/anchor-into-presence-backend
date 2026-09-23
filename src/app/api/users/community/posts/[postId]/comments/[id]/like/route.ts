import { NextRequest, NextResponse } from "next/server";
import { Comments } from "@/models/Comments";
import { connectDB } from "@/lib/db";
import { getAuthUser } from "@/lib/getAuthUser";
import mongoose from "mongoose";
import { Reactions } from "@/models/Reactions";

export async function POST(req: NextRequest, { params }: any) {
    await connectDB();

    try {
        const { userId } = await getAuthUser(req);
        const commentId = params.id;

        if (!mongoose.Types.ObjectId.isValid(commentId)) {
            return NextResponse.json(
                { status: false, message: "Invalid commentId" },
                { status: 400 }
            );
        }

        // Check comment exists
        const comment = await Comments.findById(commentId);
        if (!comment) {
            return NextResponse.json(
                { status: false, message: "Comment not found" },
                { status: 404 }
            );
        }

        // Check if reaction already exists
        const existingReaction = await Reactions.findOne({
            targetType: "comment",
            targetId: commentId,
            userId,
        });

        let liked;

        if (existingReaction) {
            // UNLIKE → remove reaction & decrement like count
            await existingReaction.deleteOne();

            comment.likesCount = Math.max(0, comment.likesCount - 1);
            await comment.save();

            liked = false;
        } else {
            // LIKE → create reaction & increment like count
            await Reactions.create({
                targetType: "comment",
                targetId: commentId,
                userId,
                type: "like",
            });

            comment.likesCount += 1;
            await comment.save();

            liked = true;
        }

        return NextResponse.json({
            status: true,
            liked,
            likesCount: comment.likesCount,
            message: liked ? "Comment liked" : "Comment unliked",
        });
    } catch (error: any) {
        console.error("COMMENT LIKE ERROR:", error);

        // Unique reaction error
        if (error.code === 11000) {
            return NextResponse.json(
                {
                    status: false,
                    message: "Reaction already exists (duplicate like prevented)",
                },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { status: false, message: "Failed to like comment" },
            { status: 500 }
        );
    }
}
