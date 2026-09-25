import { NextRequest, NextResponse } from "next/server";
import { Activity } from "@/models/Activity";
import { connectDB } from "@/lib/db"; // your DB connection utility
import mongoose, { PipelineStage } from "mongoose";
import { getAuthUser } from "@/lib/getAuthUser";
import { Category } from "@/models/Category";

export async function GET(req: NextRequest) {
  await connectDB();
  const { userId } = await getAuthUser(req);

  const url = new URL(req.url);
  const query = url.searchParams.get("search");
  const sortOrder = url.searchParams.get("sort") === "asc" ? 1 : -1;
  const filterDate = url.searchParams.get("date");
  const categories = await Category.find({}, { name: 1 });

  let matchStage: any = {
    status: 1,
  };

  // Match the published catalog used by See all, not only today's releases.
  const publishedThrough = filterDate || new Date().toISOString().split("T")[0];
  const andConditions: any[] = [
    {
      scheduleDate: { $lte: publishedThrough },
      schedulePublish: true,
    },
  ];

  if (query) {
    andConditions.push({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { "category.name": { $regex: query, $options: "i" } },
        { "tag.name": { $regex: query, $options: "i" } },
      ],
    });
  }

  if (andConditions.length > 0) {
    matchStage.$and = andConditions;
  }

  const pipeline: PipelineStage[] = [
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" },

    {
      $lookup: {
        from: "tags",
        localField: "tags",
        foreignField: "_id",
        as: "tags",
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

    { $match: matchStage },

    {
      $project: {
        _id: 1,
        name: 1,
        thumbnail: 1,
        video: 1,
        description: 1,
        createdAt: 1,
        categoryName: "$category.name",
        categoryId: "$category._id",
        tagName: {
          $map: {
            input: "$tags",
            as: "t",
            in: "$$t.name",
          },
        },
        isFavorite: { $gt: [{ $size: "$favoriteInfo" }, 0] },
      },
    },

    { $sort: { createdAt: sortOrder } },
  ];


  const activities = await Activity.aggregate(pipeline);

  // 1. Create dynamic grouped object
  const grouped: Record<string, any[]> = {};

  for (const cat of categories) {
    grouped[cat.name] = [];
  }
  // 2. Group activities dynamically by category name
  for (const activity of activities) {
    const categoryName = activity.categoryName;

    if (!grouped[categoryName]) {
      grouped[categoryName] = [];
    }

    // Return up to five real activities per Home category.
    if (grouped[categoryName].length < 5) {
      grouped[categoryName].push(activity);
    }
  }



  return NextResponse.json({
    message: "Activities grouped by category",
    data: grouped,
    status: true,
  });
}
