import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { AppSettings } from "@/models/AppSettings";

export const dynamic = "force-dynamic";

const DEFAULT_SETTINGS = {
  android_version: "",
  ios_version: "",
  android_is_approved: false,
  ios_is_approved: false,
  is_under_maintenance: false,
};

export async function GET() {
  try {
    await connectDB();
    const record = await AppSettings.findOne({ key: "global" })
      .select("android_version ios_version android_is_approved ios_is_approved is_under_maintenance -_id")
      .lean();
    const values = record && typeof record === "object"
      ? record as Record<string, unknown>
      : {};

    return NextResponse.json({
      settings: {
        android_version: typeof values.android_version === "string" ? values.android_version : DEFAULT_SETTINGS.android_version,
        ios_version: typeof values.ios_version === "string" ? values.ios_version : DEFAULT_SETTINGS.ios_version,
        android_is_approved: typeof values.android_is_approved === "boolean" ? values.android_is_approved : DEFAULT_SETTINGS.android_is_approved,
        ios_is_approved: typeof values.ios_is_approved === "boolean" ? values.ios_is_approved : DEFAULT_SETTINGS.ios_is_approved,
        is_under_maintenance: typeof values.is_under_maintenance === "boolean" ? values.is_under_maintenance : DEFAULT_SETTINGS.is_under_maintenance,
      },
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Load public app version settings error:", error);
    return NextResponse.json(
      { message: "Couldn’t load app version settings." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
