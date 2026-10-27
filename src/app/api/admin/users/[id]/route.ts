import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { AccountDeletionError, deleteUserAccount } from "@/lib/deleteUserAccount";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

async function isAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value;
  if (!token || !process.env.JWT_SECRET) return false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    return payload.role === "admin";
  } catch { return false; }
}

export async function PATCH(req: NextRequest, { params }: Context) {
  if (!await isAdmin(req)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
  const body = await req.json().catch(() => null);
  if (typeof body?.isBlocked !== "boolean") return NextResponse.json({ message: "isBlocked must be a boolean" }, { status: 400 });
  try {
    await connectDB();
    const deleting = await User.exists({ _id: id, deletionPending: true });
    if (deleting) return NextResponse.json({ message: "Deletion is in progress. Retry Delete to finish cleanup; this account cannot be unblocked." }, { status: 409 });
    const user = await User.findOneAndUpdate({ _id: id, deletionPending: { $ne: true } }, { $set: { isBlocked: body.isBlocked } }, { new: true, runValidators: true }).select("isBlocked");
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });
    return NextResponse.json({ isBlocked: user.isBlocked });
  } catch {
    return NextResponse.json({ message: "Could not update account access. Please try again." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Context) {
  if (!await isAdmin(req)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
  const body = await req.json().catch(() => null);
  if (typeof body?.confirmation !== "string" || !body.confirmation) return NextResponse.json({ message: "Enter the account email to confirm deletion" }, { status: 400 });
  try {
    await connectDB();
    await deleteUserAccount(id, body.confirmation);
    return NextResponse.json({ message: "Account and related database records deleted" });
  } catch (error) {
    if (error instanceof AccountDeletionError) return NextResponse.json({ message: error.message }, { status: error.status });
    console.error("Account deletion failed", error);
    return NextResponse.json({ message: "Deletion could not be completed. Retry Delete to finish cleanup. If cleanup has started, the account remains blocked until deletion completes." }, { status: 500 });
  }
}
