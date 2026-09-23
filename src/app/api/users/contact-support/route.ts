import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/getUserFromRequest";
import { connectDB } from "@/lib/db";
import { sendSupportEmail } from "@/lib/sendEmail";
import { Support } from "@/models/Support";
import { apiErrorResponse } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await connectDB();

  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { title, description } = await req.json();

  if (!title || !description) {
    return NextResponse.json(
      { message: "Title and description are required" },
      { status: 400 }
    );
  }

  try {
    await Support.create({ userId: user.userId, title, description });

    await sendSupportEmail({
      email: user.email as string,
      name: user.name as string | undefined,
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
