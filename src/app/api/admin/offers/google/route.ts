import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getGooglePlayOffers, GooglePlayError } from "@/lib/googlePlayOffers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const token = req.cookies.get("admin_session")?.value;
    if (!token || !process.env.JWT_SECRET) throw new Error();
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof payload === "string" || payload.role !== "admin") throw new Error();
  } catch {
    return NextResponse.json({ message: "Please sign in as an admin." }, { status: 401, headers });
  }
  const environment = req.nextUrl.searchParams.get("environment") ?? "production";
  if (environment !== "production" && environment !== "test") {
    return NextResponse.json({ message: "Choose production or test purchases." }, { status: 400, headers });
  }
  try {
    return NextResponse.json(await getGooglePlayOffers(environment), { headers });
  } catch (error) {
    return NextResponse.json({ message: error instanceof GooglePlayError ? error.message : "Couldn’t load Google Play purchases. Please try again." }, { status: 502, headers });
  }
}
