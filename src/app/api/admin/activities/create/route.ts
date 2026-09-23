import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Activity } from "@/models/Activity";
import { uploadToS3 } from "@/lib/s3";
import { Tags } from "@/models/Tags";
import { apiErrorResponse } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const formData = await req.formData();

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

    const file = formData.get("media") as File | null;
    const thumbnail = formData.get("thumbnail") as File;

    if (!name || !description || !category || !thumbnail) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const thumbnailExt = thumbnail.name.split(".").pop();
    const thumbnailFilename = `${crypto.randomUUID()}.${thumbnailExt}`;
    const thumbnailPath = await uploadToS3(thumbnail, thumbnailFilename);

    let videoPath = "";
    if (file && typeof file === "object" && file.size > 0) {
      const ext = file.name.split(".").pop();
      const filename = `${crypto.randomUUID()}.${ext}`;
      videoPath = await uploadToS3(file, filename);
    }

    const newActivity = await Activity.create({
      name,
      description,
      contentId,
      video: videoPath,
      thumbnail: thumbnailPath,
      category: category,
      contentType,
      tags,
      duration,
      schedulePublish,
      scheduleDate: scheduleDate??'',
      scheduleTime: scheduleTime??''
    });

    return NextResponse.json(
      { message: "Activity created", activity: newActivity },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Activity Upload Error:", err);
    return apiErrorResponse(err, { message: "Server error" });
  }
}
