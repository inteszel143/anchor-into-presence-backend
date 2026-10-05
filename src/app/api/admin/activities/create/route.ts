import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Activity } from "@/models/Activity";
import { uploadToS3 } from "@/lib/s3";
import { Category } from "@/models/Category";
import mongoose from "mongoose";
import { isDailyPauseCategory } from "@/lib/activityMedia";
import { Tags } from "@/models/Tags";
import { apiErrorResponse } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const started = Date.now();
  const timings: Record<string, number> = {};
  async function measure<T>(stage: string, operation: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try { return await operation(); }
    finally { timings[stage] = Date.now() - start; }
  }
  try {
    const [formData] = await Promise.all([
      measure("receive", () => req.formData()),
      measure("database_connect", () => connectDB()),
    ]);

    const name = formData.get("name")?.toString();
    const description = formData.get("description")?.toString();
    const tagsString = formData.get("tags")?.toString();
    const category = formData.get("category")?.toString();
    const contentType = formData.get("contentType")?.toString();    
    const contentId = formData.get("contentId")?.toString();    
    const duration = formData.get("duration")?.toString();
    const schedulePublish = formData.get("schedulePublish")?.toString();
    const scheduleDate = formData.get("scheduleDate")?.toString();
    const scheduleTime = formData.get("scheduleTime")?.toString();

    const file = formData.get("media") as File | null;
    const thumbnail = formData.get("thumbnail");
    if (!name || !description || !category || !(thumbnail instanceof File) || thumbnail.size === 0) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return NextResponse.json({ message: "Invalid category" }, { status: 400 });
    }
    const selectedCategory = await measure("category", () => Promise.resolve(Category.findById(category)));
    if (!selectedCategory) {
      return NextResponse.json({ message: "Category not found" }, { status: 400 });
    }
    const isDailyPause = isDailyPauseCategory(selectedCategory.name);
    if (isDailyPause && !thumbnail.type.startsWith("image/")) {
      return NextResponse.json({ message: "Upload a static / quote image for this Daily Pause" }, { status: 400 });
    }

    let tags: any[] = [];
    if (tagsString && tagsString.trim() !== "") {
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

    const thumbnailExt = thumbnail.name.split(".").pop();
    const thumbnailFilename = `${crypto.randomUUID()}.${thumbnailExt}`;
    const [thumbnailPath, videoPath] = await Promise.all([
      measure("thumbnail_upload", () => uploadToS3(thumbnail, thumbnailFilename)),
      !isDailyPause && file instanceof File && file.size > 0
        ? measure("media_upload", () => uploadToS3(file, `${crypto.randomUUID()}.${file.name.split(".").pop()}`))
        : Promise.resolve(""),
    ]);

    const newActivity = await measure("save", () => Activity.create({
      name,
      description,
      contentId,
      video: videoPath,
      thumbnail: thumbnailPath,
      category: category,
      contentType: isDailyPause ? "Image" : contentType,
      tags,
      duration: isDailyPause ? "0" : duration,
      schedulePublish,
      scheduleDate: scheduleDate??'',
      scheduleTime: scheduleTime??''
    }));

    return NextResponse.json(
      { message: "Activity created", activity: newActivity },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Activity Upload Error:", err);
    return apiErrorResponse(err, { message: "Server error" });
  } finally {
    // Durations only: never log uploaded content or form fields.
    console.info("Activity creation timings (ms)", { ...timings, total: Date.now() - started });
  }
}
