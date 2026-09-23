import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { UserActivityLogs } from "@/models/UserActivityLogs";
import { apiErrorResponse } from "@/lib/apiResponse";
import { startOfWeek, endOfWeek, addDays, format } from "date-fns";
import { getAuthUser } from "@/lib/getAuthUser";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  await connectDB();
  const { userId } = await getAuthUser(req);

  try {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 }); // Sunday
    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const weeklyData = await UserActivityLogs.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId as string),
          createdAt: {
            $gte: weekStart,
            $lte: endOfWeek(weekStart, { weekStartsOn: 1 }),
          },
        },
      },
      {
        $addFields: {
          watchedDurationMinutes: {
            $cond: [
              { $ifNull: ["$videoTimestamp", false] },
              {
                $add: [
                  {
                    $toInt: {
                      $arrayElemAt: [{ $split: ["$videoTimestamp", ":"] }, 0],
                    },
                  },
                  {
                    $divide: [
                      {
                        $toInt: {
                          $arrayElemAt: [
                            { $split: ["$videoTimestamp", ":"] },
                            1,
                          ],
                        },
                      },
                      60,
                    ],
                  },
                ],
              },
              0,
            ],
          },
          dayOfWeek: { $isoDayOfWeek: "$createdAt" }, // 1 (Mon) - 7 (Sun)
        },
      },
      {
        $group: {
          _id: "$dayOfWeek",
          totalWatched: { $sum: "$watchedDurationMinutes" },
        },
      },
    ]);

    // Fill in missing days with 0 and map labels
    const week = dayLabels.map((label, i) => {
      const match = weeklyData.find((item) => item._id === i + 1);
      return {
        day: label,
        value: match ? Math.round(match.totalWatched) : 0,
      };
    });

    const logs = await UserActivityLogs.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId as string),
          createdAt: { $gte: weekStart, $lte: weekEnd },
        },
      },
      {
        $lookup: {
          from: "activities",
          localField: "activityId",
          foreignField: "_id",
          as: "activity",
        },
      },
      { $unwind: "$activity" },
      {
        $lookup: {
          from: "categories",
          localField: "activity.category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $group: {
          _id: "$category.name",
          totalWatched: {
            $sum: {
              $cond: [
                { $ifNull: ["$videoTimestamp", false] },
                {
                  $add: [
                    {
                      $toInt: {
                        $arrayElemAt: [{ $split: ["$videoTimestamp", ":"] }, 0],
                      },
                    },
                    {
                      $divide: [
                        {
                          $toInt: {
                            $arrayElemAt: [
                              { $split: ["$videoTimestamp", ":"] },
                              1,
                            ],
                          },
                        },
                        60,
                      ],
                    },
                  ],
                },
                0,
              ],
            },
          },
        },
      },
    ]);

    const total = logs.reduce((acc, item) => acc + item.totalWatched, 0);

    const categories = logs.map((item) => ({
      name: item._id,
      value: item.totalWatched,
      percentage: Math.round((item.totalWatched / total) * 100),
    }));

    const averageRaw = total / categories.length || 0;

    const maxValue = Math.max(...categories.map((c) => c.value), 1); // avoid division by 0
    const averageScaled = (averageRaw / maxValue) * 5;

    return NextResponse.json({
      message: "Category distribution for current week",
      data: {
        average: parseFloat(averageScaled.toFixed(2)),
        categories,
        week,
      },
      status: true,
    });
  } catch (error) {
    return apiErrorResponse(error, { message: "Internal server error" });
  }
}
