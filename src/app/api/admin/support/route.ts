import { connectDB } from "@/lib/db";
import { Support } from "@/models/Support";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  let page = parseInt(searchParams.get("page") || "1", 10);
  if (isNaN(page) || page < 1) page = 1;
  let limit = parseInt(searchParams.get("limit") || "10", 10);
  if (isNaN(limit) || limit < 1) limit = 10;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { title: { $regex: search, $options: "i" } },
    ];
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const total = await Support.countDocuments(query);
  const support = await Support.aggregate([
    { $match: query },

    { $sort: { createdAt: -1 } },

    { $skip: (page - 1) * limit },

    { $limit: limit },

    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id", 
        as: "user", 
      },
    },

    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

    {
      $project: {
        title: 1,
        name: 1,
        status: 1,
        description: 1,
        createdAt: 1,
        userName: "$user.name",
      },
    },
  ]);

  return NextResponse.json({
    support,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
