import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Content } from "@/models/Content";
import { apiErrorResponse } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const { description } = await req.json();

    const content = await Content.findById(id);
    content.description = description;
    await content.save();

    const plain = {
      _id: content._id.toString(),
      description: content.description,
    };

    return NextResponse.json(
      { message: "Content updated successfully", content: plain, status: true },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Update Activity Error:", err);
    return apiErrorResponse(err, { message: "Server error" });
  }
}
