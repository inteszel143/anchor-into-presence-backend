import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Content } from "@/models/Content";
import { apiErrorResponse } from "@/lib/apiResponse";
import { jwtVerify } from "jose";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value;
  try {
    if (!token || !process.env.JWT_SECRET) throw new Error("Unauthorized");
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    if (payload.role !== "admin") throw new Error("Unauthorized");
  } catch {
    return NextResponse.json({ message: "Please sign in as an admin", status: false }, { status: 401 });
  }
  try {
    const { contentType, description } = await req.json();
    if (!["terms", "privacy"].includes(contentType) || typeof description !== "string") {
      return NextResponse.json({ message: "A valid document type and text are required", status: false }, { status: 400 });
    }
    await connectDB();
    // A first save also works in a database without seeded legal documents.
    const content = await Content.findOneAndUpdate(
      { contentType },
      { $set: { description } },
      { upsert: true, new: true, runValidators: true }
    );
    return NextResponse.json({
      message: "Content saved successfully",
      content: { _id: content._id.toString(), description: content.description },
      status: true,
    });
  } catch (error: unknown) {
    console.error("Save Content Error:", error);
    return apiErrorResponse(error, { message: "Couldn’t save the document. Please try again." });
  }
}
