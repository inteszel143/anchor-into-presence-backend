import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectDB } from "@/lib/db";
import { AppSettings } from "@/models/AppSettings";

export const dynamic = "force-dynamic";

const SETTINGS_KEY = "global";

type VersionSettings = {
  android_version: string;
  ios_version: string;
  android_is_approved: boolean;
  ios_is_approved: boolean;
  is_under_maintenance: boolean;
};

const DEFAULT_SETTINGS: VersionSettings = {
  android_version: "",
  ios_version: "",
  android_is_approved: false,
  ios_is_approved: false,
  is_under_maintenance: false,
};

async function isAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value;
  if (!token || !process.env.JWT_SECRET) return false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    return payload.role === "admin";
  } catch {
    return false;
  }
}

function toSettings(record: unknown): VersionSettings {
  const values = record && typeof record === "object"
    ? record as Record<string, unknown>
    : {};
  return {
    android_version: typeof values.android_version === "string" ? values.android_version : DEFAULT_SETTINGS.android_version,
    ios_version: typeof values.ios_version === "string" ? values.ios_version : DEFAULT_SETTINGS.ios_version,
    android_is_approved: typeof values.android_is_approved === "boolean" ? values.android_is_approved : DEFAULT_SETTINGS.android_is_approved,
    ios_is_approved: typeof values.ios_is_approved === "boolean" ? values.ios_is_approved : DEFAULT_SETTINGS.ios_is_approved,
    is_under_maintenance: typeof values.is_under_maintenance === "boolean" ? values.is_under_maintenance : DEFAULT_SETTINGS.is_under_maintenance,
  };
}

export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) {
    return NextResponse.json({ message: "Please sign in as an admin." }, { status: 401 });
  }
  try {
    await connectDB();
    const record = await AppSettings.findOne({ key: SETTINGS_KEY }).lean();
    return NextResponse.json({ settings: toSettings(record) }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Load app version settings error:", error);
    return NextResponse.json({ message: "Couldn’t load app version settings. Please try again." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!await isAdmin(req)) {
    return NextResponse.json({ message: "Please sign in as an admin." }, { status: 401 });
  }

  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Enter valid app version settings." }, { status: 400 });
  }

  const settings = body as Partial<VersionSettings>;
  const versions = [settings.android_version, settings.ios_version];
  if (
    versions.some(version => typeof version !== "string" || !version.trim() || version.trim().length > 32) ||
    typeof settings.android_is_approved !== "boolean" ||
    typeof settings.ios_is_approved !== "boolean" ||
    typeof settings.is_under_maintenance !== "boolean"
  ) {
    return NextResponse.json({ message: "Enter both app versions (up to 32 characters) and choose each status." }, { status: 400 });
  }

  try {
    await connectDB();
    const record = await AppSettings.findOneAndUpdate(
      { key: SETTINGS_KEY },
      {
        $set: {
          android_version: settings.android_version!.trim(),
          ios_version: settings.ios_version!.trim(),
          android_is_approved: settings.android_is_approved,
          ios_is_approved: settings.ios_is_approved,
          is_under_maintenance: settings.is_under_maintenance,
        },
        $setOnInsert: { key: SETTINGS_KEY },
      },
      { new: true, upsert: true, runValidators: true }
    ).lean();
    if (!record) throw new Error("App version settings were not saved.");

    return NextResponse.json(
      { message: "App version settings saved.", settings: toSettings(record) },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Save app version settings error:", error);
    return NextResponse.json({ message: "Couldn’t save app version settings. Please try again." }, { status: 500 });
  }
}
