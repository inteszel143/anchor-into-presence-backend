import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Content } from "@/models/Content";
import { apiErrorResponse } from "@/lib/apiResponse";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: "Invalid document ID", status: false }, { status: 400 });
    }
    const { description } = await req.json();
    if (typeof description !== "string") {
      return NextResponse.json({ message: "Description must be text", status: false }, { status: 400 });
    }

    await connectDB();
    const content = await Content.findById(id);
    if (!content) {
      return NextResponse.json({ message: "Document not found. Reload the page and try again.", status: false }, { status: 404 });
    }
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
  } catch (err: unknown) {
    console.error("Update Content Error:", err);
    return apiErrorResponse(err, { message: "Server error" });
  }
}
