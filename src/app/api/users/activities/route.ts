import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Activity } from "@/models/Activity";
import mongoose, { PipelineStage } from "mongoose";
import { getAuthUser } from "@/lib/getAuthUser";

export async function GET(req: NextRequest) {
  await connectDB();
  const { userId } = await getAuthUser(req);

  const { searchParams } = req.nextUrl;

  let page = parseInt(searchParams.get("page") || "1", 10);
  if (isNaN(page) || page < 1) page = 1;
  let limit = parseInt(searchParams.get("limit") || "10", 10);
  if (isNaN(limit) || limit < 1) limit = 10;
  const query = searchParams.get("search")?.toLowerCase() || "";
  const categoryId = searchParams.get("categoryId") || '';
  const filterDate = new Date();

  const skip = (page - 1) * limit;
  const sortOrder = searchParams.get("sort") === "asc" ? 1 : -1;

  let matchStage: any = {
    status: 1,
  };

  const andConditions: any[] = [];

  const now = new Date();
  const formattedDate = now.toISOString().split('T')[0];
  const formattedTime = now.toTimeString().split(' ')[0];



  if (filterDate) {
    andConditions.push({
      scheduleDate: { $lte: formattedDate },
      schedulePublish: true,
      status: 1,
    });
  } else {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const currentDateStr = `${yyyy}-${mm}-${dd}`;
    andConditions.push({
      $or: [
        { scheduleDate: { $lte: currentDateStr } },
        { scheduleDate: "" },
        { scheduleDate: null },
        { scheduleDate: { $exists: false } },
      ],
    });
  }


  if (query) {
    andConditions.push({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { "tags.name": { $regex: query, $options: "i" } },
      ],
    });
  }

  if (categoryId) {
    andConditions.push({
      category: new mongoose.Types.ObjectId(categoryId),
    });
  }

  if (andConditions.length > 0) {
    matchStage.$and = andConditions;
  }

  const pipeline: PipelineStage[] = [
    {
      $lookup: {
        from: "tags",
        localField: "tags",
        foreignField: "_id",
        as: "tags",
        pipeline: [
          { $project: { name: 1 } }, // ✅ only return category name + _id
        ],
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
                  }, // <-- Inject userId dynamically
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
        name: 1,
        video: 1,
        description: 1,
        _id: 1,
        thumbnail: 1,
        tags: "$tags",
        isFavorite: { $gt: [{ $size: "$favoriteInfo" }, 0] },
      },
    },
    { $sort: { createdAt: sortOrder } },

    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: "count" }],
        recommendedActivities: [
          { $match: { isFavorite: false } },
          { $limit: 3 },
        ],
      },
    },
  ];

  const result = await Activity.aggregate(pipeline);

  const activities = result[0].data;
  const recommendedActivities = result[0].recommendedActivities
  const total = result[0].totalCount[0]?.count || 0;
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    message: "Activities fetched successfully",
    data: activities,
    recommendedActivities,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
    status: true,
  });
}
