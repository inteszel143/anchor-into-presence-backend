import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db"; // your DB connection utility
import { getAuthUser } from "@/lib/getAuthUser";
import { User } from "@/models/User";

export async function DELETE(req: NextRequest) {
  await connectDB();
  const { userId } = await getAuthUser(req);

  await User.findByIdAndDelete(userId)

  return NextResponse.json({
    message: "Account Deleted Successfully",
    data: {},
    status: true,
  });
}
