import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Content } from "@/models/Content";

export async function GET(req: NextRequest) {
  await connectDB();

  const terms = await Content.findOne({ contentType: "terms" });
  return NextResponse.json({
    message: "Data fetched successfully",
    data: terms,
    status: true,
  });
}
