import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { UserActivityLogs } from "@/models/UserActivityLogs";
import { getAuthUser } from "@/lib/getAuthUser";
import mongoose, { PipelineStage } from "mongoose";
import { Activity } from "@/models/Activity";

export const dynamic = "force-dynamic";

/**
 * GET /api/users/activities/[id]
 * Fetches single activity details by ID including tags and favorite status for the authenticated user.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await params;
  const { userId } = await getAuthUser(req);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({
      message: "Invalid activity id",
      data: {},
      status: false,
    });
  }

  const pipeline: PipelineStage[] = [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(id),
        status: 1,
      },
    },
    {
      $lookup: {
        from: "tags",
        localField: "tags",
        foreignField: "_id",
        as: "tags",
        pipeline: [{ $project: { name: 1 } }],
      },
    },
    {
      $lookup: {
        from: "favorite_activities",
        let: { activityId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$activityId", "$$activityId"] },
                  {
                    $eq: [
                      "$userId",
                      new mongoose.Types.ObjectId(userId as string),
                    ],
                  },
                ],
              },
            },
          },
          { $limit: 1 },
        ],
        as: "favoriteInfo",
      },
    },
    {
      $project: {
        name: 1,
        video: 1,
        description: 1,
        thumbnail: 1,
        tags: 1,
        isFavorite: { $gt: [{ $size: "$favoriteInfo" }, 0] },
        createdAt: 1,
      },
    },
  ];

  const result = await Activity.aggregate(pipeline);

  if (!result.length) {
    return NextResponse.json({
      message: "No activity found",
      data: {},
      status: true,
    });
  }

  return NextResponse.json({
    message: "Activity fetched successfully",
    data: result[0],
    status: true,
  });
}

/**
 * POST /api/users/activities/[id]
 * Logs user watch history / progress for an activity (e.g. video timestamp, duration, completion).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { userId } = await getAuthUser(req);
  const { id } = await params;
  const { videoTimestamp, totalVideoTime, isCompleted } = await req.json();

  if (!videoTimestamp || !totalVideoTime) {
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );
  }

  const log = await UserActivityLogs.create({
    userId,
    activityId: new mongoose.Types.ObjectId(id),
    videoTimestamp,
    totalVideoTime,
    isCompleted: isCompleted === true || isCompleted === "true",
  });

  return NextResponse.json({
    message: "Activity log created",
    data: log,
    status: true,
  });
}




