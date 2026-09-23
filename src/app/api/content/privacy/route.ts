import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Content } from "@/models/Content";

export async function GET(req: NextRequest) {
  await connectDB();

  const privacy = await Content.findOne({ contentType: "privacy" });

  return NextResponse.json({
    message: "Data fetched successfully",
    data: privacy,
    status: true,
  });
}
