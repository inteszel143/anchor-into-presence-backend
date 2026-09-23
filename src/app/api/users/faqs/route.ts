import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Faq } from "@/models/Faq";

export async function GET(req: NextRequest) {
  await connectDB();

  const { searchParams } = req.nextUrl;

  let page = parseInt(searchParams.get("page") || "1", 10);
  if (isNaN(page) || page < 1) page = 1;
  let limit = parseInt(searchParams.get("limit") || "10", 10);
  if (isNaN(limit) || limit < 1) limit = 10;
  const query = searchParams.get("search") || "";

  const skip = (page - 1) * limit;

  const filter = query
    ? {
      $or: [
        { question: { $regex: query, $options: "i" } },
        { answer: { $regex: query, $options: "i" } },
      ],
    }
    : {};

  const [faqs, total] = await Promise.all([
    Faq.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Faq.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    message: "Faqs fetched successfully",
    data: faqs,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
    status: true,
  });
}
