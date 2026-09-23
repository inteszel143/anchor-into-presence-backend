import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { getAuthUser } from "@/lib/getAuthUser";
import { apiErrorResponse } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, description } = body;

    if (!name || !description) {
      return NextResponse.json(
        { message: "name and description are required", status: false },
        { status: 400 }
      );
    }
    const category = await Category.create({ name, description });

    return NextResponse.json({
      message: "Categories saved successfully",
      data: category,
      status: true,
    });
  } catch (error) {
    console.error("Error saving user selected categories:", error);
    return apiErrorResponse(error, { message: "Internal Server Error" });
  }
}
