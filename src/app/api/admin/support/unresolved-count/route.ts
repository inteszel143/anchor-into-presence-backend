import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Support } from "@/models/Support";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const count = await Support.countDocuments({ status: 0 });
    return NextResponse.json({ count }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ message: "Could not load unresolved support count." }, { status: 500 });
  }
}
