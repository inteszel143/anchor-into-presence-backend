"use client";

import { activityFileSizeError } from "@/lib/activityUploadLimits";
import { useEffect, useState } from "react";
import { uploadActivity } from "@/lib/uploadActivity";
import { isDailyPauseCategory } from "@/lib/activityMedia";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus } from "lucide-react";
import Select from "react-select";
import { toast } from "react-toastify";
import styles from "../activity-form.module.css";

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const router = useRouter();

  const isDailyPause = isDailyPauseCategory(categories.find(cat => cat._id === selectedCategory)?.name);

  const categoryOptions: OptionType[] = categories.map((cat) => ({
    value: cat._id,
    label: cat.name,
  }));

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/admin/category/dropdown");
        if (!res.ok) throw new Error("Unable to load categories");
        const data = await res.json();
        setCategories(data.data || []);
      } catch {
        toast.error("Couldn’t load categories. Reload the page to try again.");
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => () => {
    if (mediaPreview?.startsWith("blob:")) URL.revokeObjectURL(mediaPreview);
  }, [mediaPreview]);
  useEffect(() => () => {
    if (thumbnailPreview?.startsWith("blob:")) URL.revokeObjectURL(thumbnailPreview);
  }, [thumbnailPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    toast.dismiss()
    toast.clearWaitingQueue();
    if (
      !name ||
      !description ||
      (!isDailyPause && !durationInMinutes) ||
      !contentId ||
      !contentType ||
      !thumbnailFile ||
      !selectedCategory
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setUploadProgress(0);
    const sizeError = activityFileSizeError(isDailyPause ? null : mediaFile, contentType === "Audio" ? "Audio" : "Video")
      || activityFileSizeError(thumbnailFile, "Image");
    if (sizeError) { toast.error(sizeError); return; }
    setLoading(true);
    try {


    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("tags", tags);
    formData.append("category", selectedCategory);
    formData.append("duration", isDailyPause ? "0" : String(durationInMinutes));
    formData.append("contentId", contentId);
    formData.append("contentType", isDailyPause ? "Image" : contentType);
    if (!isDailyPause && mediaFile) {
      formData.append("media", mediaFile);
    }
    formData.append("thumbnail", thumbnailFile);
    formData.append("schedulePublish", String(schedulePublish));
    formData.append("scheduleDate", scheduleDate);
    formData.append("scheduleTime", scheduleTime);

    const res = await uploadActivity(formData, setUploadProgress);

    if (res.ok) {
      toast.success("Activity created successfully.");
      router.push("/admin/activities"); // Redirect to list page
    } else {
      toast.error(res.message || "Failed to create activity.");
    }

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Activity library</p>
        <h1>Add activity</h1>
        <p className={styles.subtitle}>Create a new activity for your library.</p>
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
                  ></textarea>
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="activity-category">Category</label>
                  <Select inputId="activity-category" instanceId="activity-category" classNamePrefix="activity-select"
                    options={categoryOptions}
                    value={categoryOptions.find((opt) => opt.value === selectedCategory) || null}
                    onChange={(opt) => setSelectedCategory(opt ? opt.value : "")}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="activity-tags">Tags (comma separated)</label>
                  <input id="activity-tags"
                    type="text"
                    className={styles.input}
                    placeholder="relax, stress, yoga"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                </div>
              </div>
            </section>
            <section className={styles.card} aria-labelledby="activity-media">
              <div className={styles.cardHeading}>
                <h2 id="activity-media">{isDailyPause ? "Daily Pause image" : "Media & thumbnail"}</h2>
                <p>{isDailyPause ? "Upload the image people will see when they open this pause." : "Upload your activity media and cover image."}</p>
              </div>
              <div className={styles.cardBody}>
                {!isDailyPause && <div className={styles.field}>
                  <label className={styles.label} htmlFor="activity-video-upload">
                    {contentType} Upload
                  </label>

                  <p id="media-size-hint">Maximum file size: 100 MB.</p>
                  <input aria-describedby="media-size-hint" id="activity-video-upload"
                    type="file"
                    className={styles.fileInput}
                    accept={contentType === "Video" ? "video/*" : "audio/*"}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      const error = activityFileSizeError(file, contentType === "Audio" ? "Audio" : "Video");
                      if (error) {
                        toast.error(error);
                        e.target.value = "";
                        setMediaFile(null);
                        setMediaPreview(null);
                        return;
                      }
                      setMediaFile(file);

                      if(file) {
                        setMediaPreview(URL.createObjectURL(file));
                      } else {
                        setMediaPreview(null);
                      }
                    }}
                  />


                  {/* Video Preview */}
                  {mediaPreview && contentType === "Video" && (
                    <video
                      src={mediaPreview}
                      controls
                      className={styles.videoPreview}
                    />
                  )}

                  {/* Audio Preview */}
                  {mediaPreview && contentType === "Audio" && (
                    <audio
                      src={mediaPreview}
                      controls
                      className={styles.audioPreview}
                    />
                  )}
                </div>}
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="activity-thumbnail-upload">{isDailyPause ? "Static / quote image" : "Thumbnail Upload"}</label>
                  <p id="image-size-hint">Maximum image size: 10 MB.</p>
                  <input aria-describedby="image-size-hint" id="activity-thumbnail-upload"
                    type="file"
                    className={styles.fileInput}
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      const error = activityFileSizeError(file, "Image");
                      if (error) {
                        toast.error(error);
                        e.target.value = "";
                        setThumbnailFile(null);
                        setThumbnailPreview(null);
                        return;
                      }
                      setThumbnailFile(file);
                      if(file) {
                        setThumbnailPreview(URL.createObjectURL(file));
                      } else {
                        setThumbnailPreview(null);
                      }
                    }}
                    required
                  />

                  {thumbnailPreview && (
                    <img
                      src={thumbnailPreview}
                      alt={isDailyPause ? "Daily Pause preview" : "Thumbnail preview"}
                      className={isDailyPause ? styles.pausePreview : styles.thumbnailPreview}
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
                <p>{isDailyPause ? "Daily Pauses use a static image." : "Set the content type, identifier, and duration."}</p>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="activity-content-type">Content Type</label>
                  <select id="activity-content-type"
                    className={styles.input}
                    value={isDailyPause ? "Image" : contentType}
                    disabled={isDailyPause}
                    onChange={(e) => {
                      setContentType(e.target.value);
                      setMediaFile(null);
                      setMediaPreview(null);
                    }}
                  >
                    {isDailyPause && <option value="Image">Image</option>}
                    <option value="Video">Video</option>
                    <option value="Audio">Audio</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="activity-content-id">Content ID</label>
                  <input id="activity-content-id"
                    type="text"
                    className={styles.input}
                    placeholder="002"
                    value={contentId}
                    onChange={(e) => setContentId(e.target.value)}
                    required
                  />
                </div>
                {!isDailyPause && <div className={styles.field}>
                  <span className={styles.label}>Duration</span>

                  <div className={styles.twoFields}>
                    <input
                      type="number"
                      className={styles.input}
                      placeholder="Hours"
                      aria-label="Duration in hours"
                      min={0}
                      value={durationHours}
                      onChange={(e) => setDurationHours(e.target.value)}
                      required
                    />

                    <input
                      type="number"
                      className={styles.input}
                      placeholder="Minutes"
                      aria-label="Duration in minutes"
                      min={0}
                      max={59}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      required
                    />
                  </div>
                </div>}
              </div>
            </section>
            <section className={styles.card} aria-labelledby="activity-publishing">
              <div className={styles.cardHeading}>
                <h2 id="activity-publishing">Publishing</h2>
                <p>Choose whether to schedule this activity.</p>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.scheduleToggle}>
                  <label className={styles.label} htmlFor="schedulePublish">Schedule publish</label>
                  <div className={styles.toggleControl}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      id="schedulePublish"
                      checked={schedulePublish}
                      onChange={(e) => setSchedulePublish(e.target.checked)}
                    />

                  </div>
                </div>

                {schedulePublish && (
                  <div className={styles.twoFields}>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="schedule-date">Schedule Date</label>
                      <input
                        type="date" id="schedule-date"
                        className={styles.input}
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        required={schedulePublish}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="schedule-time">Schedule Time</label>
                      <input
                        type="time" id="schedule-time"
                        className={styles.input}
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        required={schedulePublish}
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
        <div className={styles.actions}>
          {loading && (
            <div className={styles.uploadStatus}>
              <span className={styles.statusIcon} aria-hidden="true">
                <LoaderCircle size={20} className={styles.spinner} />
              </span>
              <div className={styles.statusContent}>
                <div role="status" aria-live="polite" aria-atomic="true">
                  <p className={styles.statusTitle}>
                    {uploadProgress < 100 ? "Uploading files" : "Saving your activity"}
                  </p>
                  <p className={styles.statusDescription}>
                    {uploadProgress < 100
                      ? "Please keep this page open while your files upload."
                      : "Files received. Finishing up—please keep this page open."}
                  </p>
                </div>
                {uploadProgress < 100 && (
                  <div className={styles.progressRow}>
                    <progress className={styles.uploadProgress} value={uploadProgress} max={100} aria-label="File upload progress" />
                    <span className={styles.progressValue} aria-hidden="true">{uploadProgress}%</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <button type="submit" className={styles.submit} disabled={loading} aria-busy={loading}>
            {!loading && <Plus size={18} aria-hidden="true" />}
            {loading ? (uploadProgress < 100 ? "Uploading…" : "Saving…") : "Create activity"}
          </button>
        </div>
      </form>
    </div>
  );
}
