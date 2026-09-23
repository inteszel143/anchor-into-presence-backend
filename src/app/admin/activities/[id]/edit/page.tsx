"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Select from "react-select";
import { toast } from "react-toastify";
import { getImageUrl } from "@/lib/getImageUrl";

type Category = { _id: string; name: string };
type OptionType = { value: string; label: string };

export default function EditActivityPage() {
  const { id } = useParams();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const [contentType, setContentType] = useState("");
  const [contentId, setContentId] = useState("");
  const [duration, setDuration] = useState("");
  const [schedulePublish, setSchedulePublish] = useState("");

  const [loading, setLoading] = useState(false);

  const categoryOptions: OptionType[] = categories.map((cat) => ({
    value: cat._id,
    label: cat.name,
  }));

  useEffect(() => {
    const fetchData = async () => {
            toast.dismiss()
      toast.clearWaitingQueue();
      try {
        const [activityRes, categoryRes] = await Promise.all([
          fetch(`/api/admin/activities/${id}`),
          fetch("/api/admin/category/dropdown"),
        ]);

        const activityData = await activityRes.json();
        const categoryData = await categoryRes.json();

        if (activityData.data) {
          const act = activityData.data;
          setName(act.name);
          setDescription(act.description);
          setTags(act.tags?.map((t: any) => t.name) || []);
          setSelectedCategory(act.category || null);
          setVideoPreview(act.video || null);
          setThumbnailPreview(act.thumbnail || null);
          setContentType(act.contentType || "");
          setContentId(act.contentId || "");
          setDuration(act.duration || "");
          setSchedulePublish(act.schedulePublish || "");
        }

        setCategories(categoryData.data || []);
      } catch (error) {
        console.error("Failed to fetch activity or categories:", error);
        toast.error("Error loading data.");
      }
    };

    fetchData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
      toast.dismiss()
      toast.clearWaitingQueue();
    if (!name.trim() || !description.trim() || tags.length === 0) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("tags", tags.join(","));
      if (selectedCategory) formData.append("category", selectedCategory);
      if (contentType) formData.append("contentType", contentType);
      if (contentId) formData.append("contentId", contentId);
      if (duration) formData.append("duration", duration);
      if (schedulePublish) formData.append("schedulePublish", schedulePublish);
      if (videoFile) formData.append("video", videoFile);
      if (thumbnailFile) formData.append("thumbnail", thumbnailFile);

      const res = await fetch(`/api/admin/activities/${id}`, {
        method: "PATCH",
        body: formData,
      });

      if (res.ok) {
        toast.success("Activity updated successfully.");
        router.push("/admin/activities");
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to update activity.");
      }
    } catch (error) {
      console.error("Error updating activity:", error);
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <div className="common-content-wrapper">
          <div className="sub-heading">
            <h2>Edit Activity</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
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
            <div>
              <label className="block text-sm font-medium">Description</label>
              <textarea
                className="form-control"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium">
                Tags (comma separated)
              </label>
              <input
                type="text"
                className="form-control"
                value={tags.join(", ")}
                onChange={(e) =>
                  setTags(
                    e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                  )
                }
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <Select
                options={categoryOptions}
                value={
                  categoryOptions.find(
                    (opt) => opt.value === selectedCategory
                  ) || null
                }
                onChange={(opt) => setSelectedCategory(opt?.value || null)}
              />
            </div>

            {/* Video Upload */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Video Upload
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setVideoFile(file);
                  if (file) setVideoPreview(URL.createObjectURL(file));
                }}
              />
              {videoPreview && (
                <video
                  src={getImageUrl(videoPreview)}
                  controls
                  className="w-full max-h-96 border rounded mt-2"
                />
              )}
            </div>

            {/* Thumbnail Upload */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Thumbnail Upload
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setThumbnailFile(file);
                  if (file) setThumbnailPreview(URL.createObjectURL(file));
                }}
              />
              {thumbnailPreview && (
                <img
                  src={getImageUrl(thumbnailPreview)}
                  alt="Thumbnail Preview"
                  className="w-40 h-40 object-cover border rounded mt-2"
                />
              )}
            </div>

            {/* Extra Fields */}
            <div>
              <label className="block text-sm font-medium">Content Type</label>
              <input
                type="text"
                className="form-control"
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Content ID</label>
              <input
                type="text"
                className="form-control"
                value={contentId}
                onChange={(e) => setContentId(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Duration</label>
              <input
                type="text"
                className="form-control"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">
                Schedule Publish
              </label>
              <input
                type="date"
                className="form-control"
                value={schedulePublish}
                onChange={(e) => setSchedulePublish(e.target.value)}
              />
            </div>

            {/* Submit */}
            <div className="hstack justify-content-end mt-3">
              <button
                type="submit"
                className="btn btn-primary px-5 py-2 rounded"
                disabled={loading}
              >
                {loading ? "Updating..." : "Update Activity"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
