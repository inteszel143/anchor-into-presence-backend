import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromRequest } from "@/lib/getUserFromRequest";
import { User } from "@/models/User";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function PATCH(req: NextRequest) {
  await connectDB();

  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { status }  = await req.json()


  const updated = await User.findByIdAndUpdate(
    user.userId,
    {
      notificationReceive: status,
    },
    { new: true }
  );

  return NextResponse.json({
    message: "Profile updated successfully",
    data: updated,
    status: true,
  });
}
