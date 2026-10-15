import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { AppStoreError, getAppStoreOffers } from "@/lib/appStoreOffers";

import { findOfferCustomers } from "@/lib/offerCustomers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const token = req.cookies.get("admin_session")?.value;
    if (!token || !process.env.JWT_SECRET) throw new Error("Unauthorized");
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof payload === "string" || payload.role !== "admin") throw new Error("Unauthorized");
  } catch {
    return NextResponse.json({ message: "Please sign in as an admin." }, { status: 401, headers });
  }
  const environment = req.nextUrl.searchParams.get("environment") ?? "production";
  if (environment !== "production" && environment !== "sandbox") {
    return NextResponse.json({ message: "Choose production or sandbox." }, { status: 400, headers });
  }
  try {
    const report = await getAppStoreOffers(environment);
    // Exact transaction matches only: never guess an account from a name or date.
    const customers = await findOfferCustomers(report.transactions.map(row => row.id), "ios");
    return NextResponse.json({ ...report, transactions: report.transactions.map(row => ({ ...row, customer: customers.get(row.id) })) }, { headers });
  } catch (error) {
    return NextResponse.json({ message: error instanceof AppStoreError ? error.message : "Couldn’t reach Apple. Please try again." }, { status: 502, headers });
  }
}
