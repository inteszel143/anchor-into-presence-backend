import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Activity } from "@/models/Activity";
import { PipelineStage } from "mongoose";

export async function GET(req: NextRequest) {
  await connectDB();

  const { searchParams } = req.nextUrl;

  let page = parseInt(searchParams.get("page") || "1", 10);
  if (isNaN(page) || page < 1) page = 1;
  let limit = parseInt(searchParams.get("limit") || "10", 10);
  if (isNaN(limit) || limit < 1) limit = 10;
  const query = searchParams.get("search")?.toLowerCase() || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
  const startDate = searchParams.get("startDate") || '';
  const endDate = searchParams.get("endDate") || '';

  const skip = (page - 1) * limit;

  // date filter
  const dateFilter: any = {};

  if (startDate) {
    dateFilter.$gte = new Date(startDate);
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // include full end day
    dateFilter.$lte = end;
  }
  // Search condition
  const matchConditions: any = {};

  if (query) {
    matchConditions.$or = [
      { name: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
      { "taggedCategoriesData.name": { $regex: query, $options: "i" } },
    ];
  }

  if (startDate || endDate) {
    matchConditions.createdAt = dateFilter;
  }
  // Aggregation pipeline
  const pipeline: PipelineStage[] = [
    {
      $lookup: {
        from: "categories",
        localField: "taggedCategories",
        foreignField: "_id",
        as: "taggedCategoriesData",
        pipeline: [{ $project: { name: 1 } }],
      },
    },
    ...(Object.keys(matchConditions).length
      ? [{ $match: matchConditions }]
      : []),
    {
      $project: {
        _id: 1,
        name: 1,
        video: 1,
        description: 1,
        status: 1,
        createdAt: 1,
        taggedCategoriesData: 1,
      },
    },
    {
      $sort: {
        [sortBy]: sortOrder,
      },
    },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: "count" }],
      },
    },
  ];


  const result = await Activity.aggregate(pipeline);

  const activities = result[0].data;
  const total = result[0].totalCount[0]?.count || 0;
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    message: "Activities fetched successfully",
    data: activities,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
    status: true,
  });
}
