import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Faq } from "@/models/Faq";
import { apiErrorResponse } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { question, answer } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { message: "question and answer are required", status: false },
        { status: 400 }
      );
    }
    const category = await Faq.create({ question, answer });

    return NextResponse.json({
      message: "Faq saved successfully",
      data: category,
      status: true,
    });
  } catch (error) {
    console.error("Error saving user selected categories:", error);
    return apiErrorResponse(error, { message: "Internal Server Error" });
  }
}
