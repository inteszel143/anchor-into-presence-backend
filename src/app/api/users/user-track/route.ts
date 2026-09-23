import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { UserActivityLogs } from "@/models/UserActivityLogs";
import { apiErrorResponse } from "@/lib/apiResponse";
import { startOfDay, endOfDay } from "date-fns"; // optional utility
import { getAuthUser } from "@/lib/getAuthUser";
import mongoose from "mongoose";
import { UserLoginStreak } from "@/models/UserLoginStreak";

export async function GET(req: NextRequest) {
  await connectDB();

  const { userId } = await getAuthUser(req);

  try {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    // 1. Run aggregation
    const logs = await UserActivityLogs.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId as string),
          createdAt: { $gte: todayStart, $lte: todayEnd },
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
        $project: {
          videoTimestamp: 1,
          thumbnail: "$activity.thumbnail",
        },
      },
    ]);
    // 2. Time conversion helpers
    function timeToSeconds(mmss: string): number {
      const [m = "0", s = "0"] = mmss.split(":");
      return parseInt(m) * 60 + parseInt(s);
    }

    // Convert seconds to "mm:ss" format
    function secondsToTime(totalSeconds: number): string {
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    // 3. Calculate total time and collect unique thumbnails
    let totalSeconds = 0;
    const thumbnailSet = new Set<string>();

    for (const log of logs) {
      if (log.videoTimestamp) {
        totalSeconds += timeToSeconds(log.videoTimestamp);
      }

      if (log.thumbnail && thumbnailSet.size < 2) {
        thumbnailSet.add(log.thumbnail);
      }
    }

    const totalTime = secondsToTime(totalSeconds);
    const thumbnails = Array.from(thumbnailSet);

    // ----------------------------------------------------------------------------categoryDistribution start----------------------------------------------------------------//
    const data = await UserActivityLogs.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId as string),
          createdAt: { $gte: todayStart, $lte: todayEnd },
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
        $addFields: {
          durationMinutes: {
            $add: [
              {
                $toInt: {
                  $arrayElemAt: [{ $split: ["$activity.duration", ":"] }, 0],
                },
              },
              {
                $divide: [
                  {
                    $toInt: {
                      $arrayElemAt: [
                        { $split: ["$activity.duration", ":"] },
                        1,
                      ],
                    },
                  },
                  60,
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$category.name",
          duration: { $sum: "$durationMinutes" },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ["$duration", 0] } },
          categories: {
            $push: {
              name: "$_id",
              duration: "$duration"
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          categories: {
            $map: {
              input: "$categories",
              as: "cat",
              in: {
                name: "$$cat.name",
                percentage: {
                  $cond: [
                    { $eq: ["$total", 0] },
                    0,
                    {
                      $round: [
                        {
                          $multiply: [
                            { $divide: ["$$cat.duration", "$total"] },
                            100
                          ]
                        },
                        0
                      ]
                    }
                  ]
                }
              }
            }
          }
        }
      }
    ]);
    // ----------------------------------------------------------------------------categoryDistribution end ----------------------------------------------------------------//

    // ----------------------------------------------------------------------------user login streak start -----------------------------------------------------------------//

    const streak = await UserLoginStreak.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId as string),
          $expr: { $gte: [{ $size: "$loginDates" }, 2] },
        },
      },
      {
        $project: {
          _id: 0,
          loginDates: {
            $map: {
              input: "$loginDates",
              as: "date",
              in: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$$date",
                },
              },
            },
          },
        },
      },
    ]);

    // ----------------------------------------------------------------------------user login streak end -----------------------------------------------------------------//

    // 4. Final result
    return NextResponse.json({
      message: "User activity summary for today",
      data: {
        loggedActivities: {
          totalTime,
          thumbnails,
        },
        categoryDistribution: {
          categories: data[0]?.categories,
        },
        loginDates: {
          streak,
        },
      },
      status: true,
    });
  } catch (error) {
    return apiErrorResponse(error, { message: "Internal server error" });
  }
}
