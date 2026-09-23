import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiResponse";
import { connectDB } from "@/lib/db";
import { Faq } from "@/models/Faq";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const deleted = await Faq.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ message: "Faq not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Faq deleted successfully",
      status: true,
    });
  } catch (err: any) {
    console.error("Delete Error:", err);
    return apiErrorResponse(err, { message: "Server error" });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params
    const body = await req.json();
    const { question, answer } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { message: "question and answer are required", status: false },
        { status: 400 }
      );
    }
    const category = await Faq.findByIdAndUpdate(
      id,
      { question, answer },
      { new: true }
    );

    return NextResponse.json({
      message: "Faq updated successfully",
      data: category,
      status: true,
    });
  } catch (error) {
    console.error("Error saving user selected categories:", error);
    return apiErrorResponse(error, { message: "Internal Server Error" });
  }
}
