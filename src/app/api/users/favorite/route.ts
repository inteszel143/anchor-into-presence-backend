import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthUser } from "@/lib/getAuthUser";
import { FavoriteActivities } from "@/models/FavoriteActivities";
import { apiErrorResponse } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  await connectDB();

  const { userId } = await getAuthUser(req);
  const body = await req.json();
  const { activityId } = body;

  try {
    // Upsert one reminder per user
    const exists = await FavoriteActivities.findOne({ activityId, userId });
    
    if (exists) {
      await FavoriteActivities.findByIdAndDelete(exists._id);
      return NextResponse.json({
        message: "Removed from favorite",
        data: {},
        status: true,
      });
    } else {
      await FavoriteActivities.create({
        userId,
        activityId,
      });
      return NextResponse.json({
        message: "Added to favorite",
        data: {},
        status: true,
      });
    }
  } catch (error) {
    return apiErrorResponse(error, { message: "Error setting reminder" });
  }
}
