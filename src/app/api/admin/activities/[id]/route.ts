import { activityFileSizeError, REQUEST_LIMIT_BYTES, UPLOAD_LIMIT_MESSAGE } from "@/lib/activityUploadLimits";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Activity } from "@/models/Activity";
import { Category } from "@/models/Category";
import mongoose from "mongoose";
import { uploadToS3 } from "@/lib/s3";
import { isDailyPauseCategory } from "@/lib/activityMedia";
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
        localField: "category",
        foreignField: "_id",
        as: "taggedCategories",
        pipeline: [{ $project: { _id: 1, name: 1 } }],
      },
    },
    {
      $lookup: {
        from: "tags",
        localField: "tags",
        foreignField: "_id",
        as: "tags",
        pipeline: [{ $project: { _id: 1, name: 1 } }],
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        video: 1,
        thumbnail: 1,
        category: 1,
        tags: 1,
        contentId: 1,
        contentType: 1,
        duration: 1,
        schedulePublish: 1,
        scheduleDate: 1,
        scheduleTime: 1,
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

  const existing = await Activity.findById(id);
  if (!existing) return NextResponse.json({ message: "Activity not found" }, { status: 404 });

  if (Number(req.headers.get("content-length")) > REQUEST_LIMIT_BYTES) {
    return NextResponse.json({ message: UPLOAD_LIMIT_MESSAGE }, { status: 413 });
  }
  const formData = await req.formData();
  const name = formData.get("name")?.toString();
  const description = formData.get("description")?.toString();
  const tagsString = formData.get("tags")?.toString();
  const category = formData.get("category")?.toString();
  const contentType = formData.get("contentType")?.toString();
  const contentId = formData.get("contentId")?.toString();
  const duration = formData.get("duration")?.toString();
  const scheduleDate = formData.get("scheduleDate")?.toString();

  const categoryId = category || existing.category;
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    return NextResponse.json({ message: "Invalid category" }, { status: 400 });
  }
  const selectedCategory = await Category.findById(categoryId);
  const isDailyPause = isDailyPauseCategory(selectedCategory?.name);
  const file = formData.get("video");
  const thumbnail = formData.get("thumbnail");
  const sizeError = activityFileSizeError(file instanceof File ? file : null, contentType === "Audio" ? "Audio" : "Video")
    || activityFileSizeError(thumbnail instanceof File ? thumbnail : null, "Image");
  if (sizeError) return NextResponse.json({ message: sizeError }, { status: 413 });
  if (isDailyPause && thumbnail !== null &&
      (!(thumbnail instanceof File) || thumbnail.size === 0 || !thumbnail.type.startsWith("image/"))) {
    return NextResponse.json({ message: "Upload a static / quote image for this Daily Pause" }, { status: 400 });
  }
  if (isDailyPause && !thumbnail && !existing.thumbnail && !existing.video) {
    return NextResponse.json({ message: "A Daily Pause image is required" }, { status: 400 });
  }

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
    // Retain video-only legacy pauses until an image is supplied.
    contentType: isDailyPause
      ? (thumbnail || existing.thumbnail ? "Image" : existing.contentType)
      : contentType,
    duration,
    contentId,
  };

  if (scheduleDate !== undefined) {
    updatePayload.scheduleDate = scheduleDate;
    updatePayload.schedulePublish = Boolean(scheduleDate);
  }

  const scheduleTime = formData.get("scheduleTime")?.toString();
  if (scheduleTime !== undefined) updatePayload.scheduleTime = scheduleTime;

  if (tags !== undefined) {
    updatePayload.tags = tags;
  }

  // Handle video upload
  if (!isDailyPause && file instanceof File && file.size > 0) {
    const filename = `${crypto.randomUUID()}-${file.name}`;
    updatePayload.video = await uploadToS3(file, filename);
  }

  if (thumbnail instanceof File && thumbnail.size > 0) {
    const filename = `${crypto.randomUUID()}-${thumbnail.name}`;
    updatePayload.thumbnail = await uploadToS3(thumbnail, filename);
  }

  const updated = await Activity.findByIdAndUpdate(id, updatePayload, {
    new: true,
  });

  if (!updated) return NextResponse.json({ message: "Activity not found" }, { status: 404 });

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
