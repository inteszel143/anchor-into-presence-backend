import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { sendSupportEmail } from "@/lib/sendEmail";
import { Support } from "@/models/Support";
import { User } from "@/models/User";
import { apiErrorResponse } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await connectDB();

  const { title, description, email } = await req.json();

  if (!title || !description || !email) {
    return NextResponse.json(
      { message: "Email, title, and description are required" },
      { status: 400 }
    );
  }

  try {
    const user = await User.findOne({ email });

    if (user) {
      await Support.create({ userId: user._id, title, description });
    }

    await sendSupportEmail({
      email,
      name: user?.name,
      title,
      description,
    });

    return NextResponse.json({
      message: "Support message sent",
      status: true,
      data: {},
    });
  } catch (err: any) {
    console.error(err);
    return apiErrorResponse(err, { message: "Failed to send message" });
  }
}
