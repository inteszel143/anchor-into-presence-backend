import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { UserActivityLogs } from "@/models/UserActivityLogs";
import { apiErrorResponse } from "@/lib/apiResponse";
import { startOfWeek, endOfWeek } from "date-fns";
import { getAuthUser } from "@/lib/getAuthUser";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  await connectDB();
  const { userId } = await getAuthUser(req);

  try {
    const weekStartsOn = req.nextUrl.searchParams.get("weekStartsOn") === "0" ? 0 : 1;
    let weekStart = startOfWeek(new Date(), { weekStartsOn });
    let weekEnd = endOfWeek(weekStart, { weekStartsOn });
    const rawOffset = req.nextUrl.searchParams.get("utcOffsetMinutes");
    const parsedOffset = rawOffset === null ? NaN : Number(rawOffset);
    const offset = Number.isInteger(parsedOffset) && Math.abs(parsedOffset) <= 840
      ? parsedOffset : 0;
    if (rawOffset !== null) {
      const local = new Date(Date.now() + offset * 60000);
      const dayDelta = (local.getUTCDay() - weekStartsOn + 7) % 7;
      weekStart = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(),
        local.getUTCDate() - dayDelta) - offset * 60000);
      weekEnd = new Date(weekStart.getTime() + 7 * 86400000 - 1);
    }
    const isoDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayLabels = weekStartsOn === 0
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      : isoDayLabels;

    const weeklyData = await UserActivityLogs.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId as string),
          createdAt: {
            $gte: weekStart,
            $lte: weekEnd,
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
          dayOfWeek: { $isoDayOfWeek: { $add: ["$createdAt", offset * 60000] } }, // 1 (Mon) - 7 (Sun)
        },
      },
      {
        $group: {
          _id: "$dayOfWeek",
          totalWatched: { $sum: "$watchedDurationMinutes" },
          completions: { $sum: { $cond: [{ $eq: ["$isCompleted", true] }, 1, 0] } },
        },
      },
    ]);

    // Fill in missing days with 0 and map labels
    const week = dayLabels.map((label) => {
      const match = weeklyData.find((item) => item._id === isoDayLabels.indexOf(label) + 1);
      return {
        day: label,
        value: match ? Math.round(match.totalWatched) : 0,
        completions: match?.completions ?? 0,
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
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiErrorResponse(error, { message: "Internal server error" });
  }
}
