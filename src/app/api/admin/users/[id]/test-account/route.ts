import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  if (typeof body?.isTestAccount !== "boolean") {
    return NextResponse.json({ message: "isTestAccount must be a boolean" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findByIdAndUpdate(
    id,
    { $set: { isTestAccount: body.isTestAccount } },
    { new: true, runValidators: true }
  ).select("isTestAccount");
  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }
  if (user.isTestAccount !== body.isTestAccount) {
    return NextResponse.json({ message: "The test account label wasn’t saved. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ isTestAccount: user.isTestAccount });
}
