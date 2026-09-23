import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Activity } from "@/models/Activity";
import { Category } from "@/models/Category";
import mongoose from "mongoose";
import { uploadToS3 } from "@/lib/s3";
import { Tags } from "@/models/Tags";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { message: "Invalid activity ID" },
      { status: 400 }
    );
  }

  const objectId = new mongoose.Types.ObjectId(id);

  const [activity] = await Activity.aggregate([
    { $match: { _id: objectId } },
    {
      $lookup: {
        from: "categories",
        localField: "taggedCategories",
        foreignField: "_id",
        as: "taggedCategories",
        pipeline: [{ $project: { _id: 1, name: 1 } }],
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        video: 1,
        status: 1,
        createdAt: 1,
        taggedCategories: 1,
      },
    },
  ]);

  if (!activity) {
    return NextResponse.json(
      { message: "Activity not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    message: "Activity fetched successfully",
    data: activity,
    status: true,
  });
}
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
  }

  const formData = await req.formData();
  const name = formData.get("name")?.toString();
  const description = formData.get("description")?.toString();
  const tagsString = formData.get("tags")?.toString();
  const category = formData.get("category")?.toString();
  const contentType = formData.get("contentType")?.toString();
  const contentId = formData.get("contentId")?.toString();
  const duration = formData.get("duration")?.toString();
  const schedulePublish = formData.get("schedulePublish")?.toString();

  let tags: any[] | undefined = undefined;
  if (tagsString !== undefined) {
    tags = [];
    if (tagsString.trim() !== "") {
      const tagsArray = tagsString.split(",").map((tag) => tag.trim()).filter(Boolean);

      if (tagsArray.length > 0) {
        // Find existing tags that match the given names
        const existingTags = await Tags.find({
          name: { $in: tagsArray },
        });

        // Extract names and IDs of existing tags
        const existingTagNames = existingTags.map((tag) => tag.name);
        const existingTagIds = existingTags.map((tag) => tag._id);

        // Identify new tags to insert (names that are not already in the database)
        const newTagNames = tagsArray.filter(
          (tag) => !existingTagNames.includes(tag)
        );

        // Create new tags and get their IDs
        let newTagIds: any[] = [];
        if (newTagNames.length > 0) {
          const newTags = await Tags.insertMany(
            newTagNames.map((name) => ({
              name: name,
            }))
          );
          newTagIds = newTags.map((tag) => tag._id);
        }

        // Combine IDs of existing and newly inserted tags
        tags = [...existingTagIds, ...newTagIds];
      }
    }
  }

  if (!name || !description) {
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );
  }

  const updatePayload: any = {
    name,
    description,
    category,
    contentType,
    duration,
    schedulePublish,
    contentId,
  };

  if (tags !== undefined) {
    updatePayload.tags = tags;
  }

  const file = formData.get("video") as File;
  const thumbnail = formData.get("thumbnail") as File;
  // Handle video upload
  if (file && file.size > 0) {
    const filename = `${crypto.randomUUID()}-${file.name}`;
    updatePayload.video = await uploadToS3(file, filename);
  }

  if (thumbnail && thumbnail.size > 0) {
    const filename = `${crypto.randomUUID()}-${thumbnail.name}`;
    updatePayload.thumbnail = await uploadToS3(thumbnail, filename);
  }

  const updated = await Activity.findByIdAndUpdate(id, updatePayload, {
    new: true,
  });

  return NextResponse.json({
    message: "Activity updated successfully",
    data: updated,
    status: true,
  });
}
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;

  const updated = await Activity.findByIdAndDelete(id);

  return NextResponse.json({
    message: "Activity deleted successfully",
    data: updated,
    status: true,
  });
}
