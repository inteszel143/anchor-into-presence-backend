import { NextRequest, NextResponse } from "next/server";
import { uploadToS3 } from "@/lib/s3";
import { connectDB } from "@/lib/db";
import { Admin } from "@/models/Admin";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "sonhondFGB4BUb^bhS65468W6yvMBmW81@jhkd9nwdk6312165";

// 🔐 Auth helper
function authenticate(headers: Headers): string {
  const authHeader = headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  if (!token) throw new Error("Unauthorized");

  const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string };
  return decoded.adminId;
}

// 📥 GET: Fetch admin profile
export async function GET(req: Request) {
  await connectDB();

  try {
    const adminId = authenticate(req.headers);

    const admin = await Admin.findById(adminId).select("name email image");
    if (!admin) {
      return NextResponse.json({ message: "Admin not found" }, { status: 404 });
    }

    return NextResponse.json(admin);
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 401 });
  }
}

// 📝 PUT: Update admin profile
export async function PUT(req: NextRequest) {
  await connectDB();

  try {
    const adminId = authenticate(req.headers);
    const formData = await req.formData();

    const name = formData.get("name")?.toString() || "";
    const email = formData.get("email")?.toString() || "";
    const file = formData.get("image") as File | null;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return NextResponse.json({ message: "Admin not found" }, { status: 404 });
    }

    // 💾 Save image if uploaded
    let imageUrl = admin.image;
    if (file && typeof file === "object" && file.size > 0) {
      const filename = `${Date.now()}_${file.name}`;
      imageUrl = await uploadToS3(file, filename);
    }

    admin.name = name;
    admin.email = email;
    admin.image = imageUrl;

    await admin.save();

    return NextResponse.json({
      message: "Profile updated successfully",
      image: imageUrl,
    });
  } catch (err: any) {
    console.error("Profile update error:", err);
    return NextResponse.json(
      { message: err.message || "Update failed" },
      { status: 500 }
    );
  }
}
