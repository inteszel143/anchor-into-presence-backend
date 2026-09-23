import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { UserActivityLogs } from "@/models/UserActivityLogs";
import { apiErrorResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/getAuthUser";
import mongoose, { PipelineStage } from "mongoose";
// Ensure models are registered for lookup reference
import "@/models/Activity";
import "@/models/Category";
import "@/models/Tags";
import "@/models/FavoriteActivities";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await connectDB();

  try {
    const { userId } = await getAuthUser(req);

    // Diagnostic logs for debugging
    const rawLogCount = await UserActivityLogs.countDocuments({
      userId: new mongoose.Types.ObjectId(userId as string),
    });
    console.log(`[Recent API] Auth user ID: ${userId} | Raw logs count in DB: ${rawLogCount}`);

    const { searchParams } = req.nextUrl;
    let page = parseInt(searchParams.get("page") || "1", 10);
    if (isNaN(page) || page < 1) page = 1;
    let limit = parseInt(searchParams.get("limit") || "10", 10);
    if (isNaN(limit) || limit < 1) limit = 10;
    const skip = (page - 1) * limit;

    const pipeline: PipelineStage[] = [
      // 1. Match logs belonging to the authenticated user
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId as string),
        },
      },
      // 2. Sort by creation time descending to get the newest plays first
      {
        $sort: { createdAt: -1 },
      },
      // 3. Group by activityId to get unique activities, retaining the latest play log details
      {
        $group: {
          _id: "$activityId",
          playedAt: { $first: "$createdAt" },
          videoTimestamp: { $first: "$videoTimestamp" },
          totalVideoTime: { $first: "$totalVideoTime" },
          isCompleted: { $first: "$isCompleted" },
        },
      },
      // 4. Sort the distinct activities by the latest played date descending
      {
        $sort: { playedAt: -1 },
      },
      // 5. Lookup the activity details
      {
        $lookup: {
          from: "activities",
          localField: "_id",
          foreignField: "_id",
          as: "activity",
        },
      },
      {
        $unwind: "$activity",
      },
      // 6. Filter only active activities
      {
        $match: {
          "activity.status": 1,
        },
      },
      // 7. Lookup category details
      {
        $lookup: {
          from: "categories",
          localField: "activity.category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },
      // 8. Lookup tags
      {
        $lookup: {
          from: "tags",
          localField: "activity.tags",
          foreignField: "_id",
          as: "tags",
        },
      },
      // 9. Lookup favorite status
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
      // 10. Project final fields
      {
        $project: {
          _id: 1,
          playedAt: 1,
          videoTimestamp: 1,
          totalVideoTime: 1,
          isCompleted: 1,
          name: "$activity.name",
          thumbnail: "$activity.thumbnail",
          video: "$activity.video",
          description: "$activity.description",
          duration: "$activity.duration",
          category: {
            _id: "$category._id",
            name: "$category.name",
          },
          tags: {
            $map: {
              input: "$tags",
              as: "t",
              in: {
                _id: "$$t._id",
                name: "$$t.name",
              },
            },
          },
          isFavorite: { $gt: [{ $size: "$favoriteInfo" }, 0] },
        },
      },
      // 11. Pagination
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await UserActivityLogs.aggregate(pipeline);

    const activities = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    console.log(`[Recent API] Aggregation activities returned: ${activities.length} | Total counted: ${total}`);

    return NextResponse.json({
      message: "Recent activities fetched successfully",
      data: activities,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      status: true,
    });
  } catch (error) {
    return apiErrorResponse(error, { message: "Internal server error" });
  }
}
