"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Select from "react-select";
import { toast } from "react-toastify";

type Category = {
  _id: string;
  name: string;
};

type OptionType = {
  value: string;
  label: string;
};

export default function CreateActivityPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [contentId, setContentId] = useState("");
  const [contentType, setContentType] = useState("Video");

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const [durationHours, setDurationHours] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");

  const durationInMinutes =
    Number(durationHours) * 60 + Number(durationMinutes);




  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const [schedulePublish, setSchedulePublish] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const [loading, setLoading] = useState(false);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const router = useRouter();

  const categoryOptions: OptionType[] = categories.map((cat) => ({
    value: cat._id,
    label: cat.name,
  }));

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await fetch("/api/admin/category/dropdown");
      const data = await res.json();
      setCategories(data.data || []);
    };
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.dismiss()
    toast.clearWaitingQueue();
    if (
      !name ||
      !description ||
      !durationInMinutes ||
      !contentId ||
      !contentType ||
      !thumbnailFile ||
      !selectedCategory
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("tags", tags);
    formData.append("category", selectedCategory);
    formData.append("duration", String(durationInMinutes));
    formData.append("contentId", contentId);
    formData.append("contentType", contentType);
    if (mediaFile) {
      formData.append("media", mediaFile);
    }
    formData.append("thumbnail", thumbnailFile);
    formData.append("schedulePublish", String(schedulePublish));
    formData.append("scheduleDate", scheduleDate);
    formData.append("scheduleTime", scheduleTime);

    const res = await fetch("/api/admin/activities/create", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      toast.success("Activity created successfully.");
      router.push("/admin/activities"); // Redirect to list page
    } else {
      const data = await res.json();
      toast.error(data.message || "Failed to create activity.");
    }

    setLoading(false);
  };

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <div className="common-content-wrapper">
          <div className="sub-heading">
            <h2>Create Activity</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="mb-3">
              <label className="block text-sm font-medium">Activity Name</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="mb-3">
              <label className="block text-sm font-medium">Description</label>
              <textarea
                className="form-control"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              ></textarea>
            </div>
            {/* Schedule Publish */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Schedule Publish</label>
              <div className="common-check-blk">
                <input
                  type="checkbox"
                  className="d-none"
                  id="schedulePublish"
                  checked={schedulePublish}
                  onChange={(e) => setSchedulePublish(e.target.checked)}
                />
                <label htmlFor="schedulePublish" />
              </div>
            </div>

            {schedulePublish && (
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="block text-sm font-medium">Schedule Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    required={schedulePublish}
                  />
                </div>
                <div className="col-md-6">
                  <label className="block text-sm font-medium">Schedule Time</label>
                  <input
                    type="time"
                    className="form-control"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    required={schedulePublish}
                  />
                </div>
              </div>
            )}

            {/* Tags */}
            <div className="mb-3">
              <label className="block text-sm font-medium">Tags (comma separated)</label>
              <input
                type="text"
                className="form-control"
                placeholder="relax, stress, yoga"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>

            {/* Duration */}
            <div className="mb-3">
              <label className="block text-sm font-medium">Duration</label>

              <div className="d-flex gap-2">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Hours"
                  min={0}
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  required
                />

                <input
                  type="number"
                  className="form-control"
                  placeholder="Minutes"
                  min={0}
                  max={59}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Content ID */}
            <div className="mb-3">
              <label className="block text-sm font-medium">Content ID</label>
              <input
                type="text"
                className="form-control"
                placeholder="002"
                value={contentId}
                onChange={(e) => setContentId(e.target.value)}
                required
              />
            </div>

            {/* Content Type */}
            <div className="mb-3">
              <label className="block text-sm font-medium">Content Type</label>
              <select
                className="form-control"
                value={contentType}
                onChange={(e) => {
                  setContentType(e.target.value);
                  setMediaFile(null);
                  setMediaPreview(null);
                }}
              >
                <option value="Video">Video</option>
                <option value="Audio">Audio</option>
              </select>
            </div>

            {/* Category */}
            <div className="mb-3">
              <label className="block text-sm font-medium">Category</label>
              <Select
                options={categoryOptions}
                value={categoryOptions.find((opt) => opt.value === selectedCategory) || null}
                onChange={(opt) => setSelectedCategory(opt ? opt.value : "")}
              />
            </div>

            {/* Video Upload */}
            <div className="mb-3">
              <label className="block text-sm font-medium">
                {contentType} Upload
              </label>

              <input
                type="file"
                accept={contentType === "Video" ? "video/*" : "audio/*"}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setMediaFile(file);

                  if (file) {
                    setMediaPreview(URL.createObjectURL(file));
                  } else {
                    setMediaPreview(null);
                  }
                }}
              />
              <br />

              {/* Video Preview */}
              {mediaPreview && contentType === "Video" && (
                <video
                  src={mediaPreview}
                  controls
                  className="w-full max-h-96 border rounded mt-2"
                />
              )}

              {/* Audio Preview */}
              {mediaPreview && contentType === "Audio" && (
                <audio
                  src={mediaPreview}
                  controls
                  className="w-full mt-2"
                />
              )}
            </div>


            {/* Thumbnail Upload */}
            <div className="mb-3">
              <label className="block text-sm font-medium">Thumbnail Upload</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setThumbnailFile(file);
                  if (file) {
                    setThumbnailPreview(URL.createObjectURL(file));
                  } else {
                    setThumbnailPreview(null);
                  }
                }}
                required
              />
              <br />
              {thumbnailPreview && (
                <img
                  src={thumbnailPreview}
                  alt="Thumbnail Preview"
                  className="w-48 mt-2 border rounded"
                />
              )}
            </div>



            {/* Submit */}
            <div className="hstack justify-content-end mt-3">
              <button
                type="submit"
                className="btn btn-primary px-5 py-2 rounded"
                disabled={loading}
              >
                {loading ? "Submitting..." : "Create Activity"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
