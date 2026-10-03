"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Select from "react-select";
import { toast } from "react-toastify";
import styles from "../../activity-form.module.css";
import { getImageUrl } from "@/lib/getImageUrl";

type Category = { _id: string; name: string };
type OptionType = { value: string; label: string };

export default function EditActivityPage() {
  const { id } = useParams();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const [contentType, setContentType] = useState("");
  const [contentId, setContentId] = useState("");
  const [duration, setDuration] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [loading, setLoading] = useState(false);

  const categoryOptions: OptionType[] = categories.map((cat) => ({
    value: cat._id,
    label: cat.name,
  }));

  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    setLoadError("");
    const fetchData = async () => {
            toast.dismiss()
      toast.clearWaitingQueue();
      try {
        const [activityRes, categoryRes] = await Promise.all([
          fetch(`/api/admin/activities/${id}`),
          fetch("/api/admin/category/dropdown"),
        ]);

        if (!activityRes.ok || !categoryRes.ok) throw new Error("Unable to load activity");
        const activityData = await activityRes.json();
        const categoryData = await categoryRes.json();

        if (cancelled) return;
        if (!activityData.data) throw new Error("Activity not found");
        if (activityData.data) {
          const act = activityData.data;
          setName(act.name);
          setDescription(act.description);
          setTags(act.tags?.map((t: { name: string }) => t.name).join(", ") || "");
          setSelectedCategory(act.category || null);
          setVideoPreview(act.video || null);
          setThumbnailPreview(act.thumbnail || null);
          setContentType(act.contentType || "");
          setContentId(act.contentId || "");
          setDuration(act.duration || "");
          setScheduleDate(act.scheduleDate || "");
        }

        setCategories(categoryData.data || []);
      } catch (error) {
        console.error("Failed to fetch activity or categories:", error);
        if (!cancelled) setLoadError("Couldn’t load this activity. Reload the page to try again.");
      } finally {
        if (!cancelled) setFetching(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || fetching || loadError) return;
      toast.dismiss()
      toast.clearWaitingQueue();
    if (!name.trim() || !description.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("tags", tags);
      if (selectedCategory) formData.append("category", selectedCategory);
      if (contentType) formData.append("contentType", contentType);
      if (contentId) formData.append("contentId", contentId);
      if (duration) formData.append("duration", duration);
      formData.append("scheduleDate", scheduleDate);
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

  if (fetching) return <div className={styles.page} role="status">Loading activity…</div>;
  if (loadError) return <div className={styles.page} role="alert">{loadError}</div>;

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Activity library</p>
        <h1>Edit activity</h1>
        <p className={styles.subtitle}>Update the details and media for this activity.</p>
      </div>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.layout}>
          <div className={styles.column}>
            <section className={styles.card} aria-labelledby="activity-details">
              <div className={styles.cardHeading}>
                <h2 id="activity-details">Activity details</h2>
                <p>Name, describe, and organize your activity.</p>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="activity-name">Activity Name</label>
                  <input id="activity-name"
                    type="text"
                    className={styles.input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="activity-description">Description</label>
                  <textarea id="activity-description"
                    className={styles.input}
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="activity-category">Category</label>
                  <Select inputId="activity-category" instanceId="activity-category" classNamePrefix="activity-select"
                    options={categoryOptions}
                    value={
                      categoryOptions.find(
                        (opt) => opt.value === selectedCategory
                      ) || null
                    }
                    onChange={(opt) => setSelectedCategory(opt?.value || null)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="activity-tags">
                    Tags (comma separated)
                  </label>
                  <input id="activity-tags"
                    type="text"
                    className={styles.input}
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                </div>
              </div>
            </section>
            <section className={styles.card} aria-labelledby="activity-media">
              <div className={styles.cardHeading}>
                <h2 id="activity-media">Media & thumbnail</h2>
                <p>Review or replace the current video and cover image.</p>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="activity-video-upload">
                    Video Upload
                  </label>
                  <input id="activity-video-upload"
                    type="file"
                    className={styles.fileInput}
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setVideoFile(file);
                      if(file) setVideoPreview(URL.createObjectURL(file));
                    }}
                  />
                  {videoPreview && (
                    <video
                      src={getImageUrl(videoPreview)}
                      controls
                      className={styles.videoPreview}
                    />
                  )}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="activity-thumbnail-upload">
                    Thumbnail Upload
                  </label>
                  <input id="activity-thumbnail-upload"
                    type="file"
                    className={styles.fileInput}
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setThumbnailFile(file);
                      if(file) setThumbnailPreview(URL.createObjectURL(file));
                    }}
                  />
                  {thumbnailPreview && (
                    <img
                      src={getImageUrl(thumbnailPreview)}
                      alt="Thumbnail Preview"
                      className={styles.thumbnailPreview}
                    />
                  )}
                </div>
              </div>
            </section>
          </div>
          <div className={styles.column}>
            <section className={styles.card} aria-labelledby="activity-settings">
              <div className={styles.cardHeading}>
                <h2 id="activity-settings">Content settings</h2>
                <p>Set the content type, identifier, and duration.</p>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="activity-content-type">Content Type</label>
                  <input id="activity-content-type"
                    type="text"
                    className={styles.input}
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="activity-content-id">Content ID</label>
                  <input id="activity-content-id"
                    type="text"
                    className={styles.input}
                    value={contentId}
                    onChange={(e) => setContentId(e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="activity-duration">Duration</label>
                  <input id="activity-duration"
                    type="text"
                    className={styles.input}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
              </div>
            </section>
            <section className={styles.card} aria-labelledby="activity-publishing">
              <div className={styles.cardHeading}>
                <h2 id="activity-publishing">Publishing</h2>
                <p>Review the publication date for this activity.</p>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="activity-schedule-publish">
                    Schedule Publish
                  </label>
                  <input id="activity-schedule-publish"
                    type="date"
                    className={styles.input}
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
        <div className={styles.actions}>
          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? "Updating..." : "Update Activity"}
          </button>
        </div>
      </form>
    </div>
  );
}
