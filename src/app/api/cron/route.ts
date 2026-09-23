import { startWeeklyReminderRunner } from "@/cron/weeklyReminderRunner.cron";
import { connectDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    startWeeklyReminderRunner();
    return NextResponse.json({
      message: "Cron job Started",
      status: true,
      data: {},
    });
  } catch (error: any) {
    return NextResponse.json({
      message: error.message,
      status: false,
      data: {},
    });
  }
}
