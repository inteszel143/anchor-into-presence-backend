"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, FolderOpen, ImageIcon, Pencil, Video } from "lucide-react";
import { getActivityImage } from "@/lib/activityMedia";
import { getImageUrl } from "@/lib/getImageUrl";
import styles from "./activity-details.module.css";

type Category = { _id: string; name: string };
type Activity = {
  _id: string;
  name: string;
  description: string;
  video: string;
  thumbnail?: string;
  contentType?: string;
  taggedCategories: Category[];
  createdAt: string;
  status: number;
};

export default function ActivityDetailsPage() {
  const { id } = useParams();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [mediaError, setMediaError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setMediaError(false);
    const fetchActivity = async () => {
      try {
        const res = await fetch(`/api/admin/activities/${id}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(res.status === 404 ? "Activity not found." : "We couldn’t load this activity. Please try again.");
        }
        const data = await res.json();
        if (!data.data) throw new Error("Activity not found.");
        if (!controller.signal.aborted) setActivity(data.data);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "We couldn’t load this activity.");
          setActivity(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchActivity();
    return () => controller.abort();
  }, [id, attempt]);

  const previewImage = activity ? getActivityImage(activity) : "";

  const created = activity?.createdAt ? new Date(activity.createdAt) : null;
  const createdLabel = created && !Number.isNaN(created.getTime())
    ? created.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "Not available";

  return (
    <div className={styles.page}>
      <Link href="/admin/activities" className={styles.back}>
        <ArrowLeft size={17} aria-hidden="true" /> Back to activities
      </Link>

      {loading ? (
        <div className={styles.emptyState} role="status">Loading activity details…</div>
      ) : error || !activity ? (
        <div className={styles.emptyState} role="alert">
          <h1>Activity unavailable</h1>
          <p>{error || "Activity not found."}</p>
          <button type="button" className={styles.editButton} onClick={() => setAttempt(value => value + 1)}>Try again</button>
        </div>
      ) : (
        <>
          <div className={styles.heading}>
            <div>
              <p className={styles.eyebrow}>Activity details</p>
              <h1>{activity.name || "Untitled activity"}</h1>
              <span className={`${styles.badge} ${activity.status === 1 ? styles.active : styles.inactive}`}>
                <span aria-hidden="true" />{activity.status === 1 ? "Active" : "Inactive"}
              </span>
            </div>
            <Link href={`/admin/activities/${activity._id}/edit`} className={styles.editButton}>
              <Pencil size={16} aria-hidden="true" /> Edit activity
            </Link>
          </div>

          <div className={styles.grid}>
            <div className={styles.main}>
              <section className={styles.card} aria-labelledby="activity-preview-title">
                <div className={styles.cardHeading}>
                  {previewImage ? <ImageIcon size={19} aria-hidden="true" /> : <Video size={19} aria-hidden="true" />}<h2 id="activity-preview-title">Media preview</h2>
                </div>
                <div className={styles.media}>
                  {previewImage && !mediaError ? (
                    <img src={getImageUrl(previewImage)} alt={`${activity.name} preview`} onError={() => setMediaError(true)} />
                  ) : activity.video && !previewImage && !mediaError ? (
                    <video key={activity.video} src={getImageUrl(activity.video)} controls playsInline preload="metadata" onError={() => setMediaError(true)} aria-label={`${activity.name} preview`}>
                      Your browser does not support this video.
                    </video>
                  ) : (
                    <div className={styles.mediaEmpty}>
                      <Video size={32} aria-hidden="true" />
                      <p>{mediaError ? "This media couldn’t load." : "No media added yet."}</p>
                      <span>{mediaError ? "Try refreshing the page or check the media in Edit activity." : "Add media from the activity editor."}</span>
                    </div>
                  )}
                </div>
              </section>
              <section className={styles.card} aria-labelledby="activity-description-title">
                <div className={styles.cardHeading}><h2 id="activity-description-title">Description</h2></div>
                <p className={styles.description}>{activity.description?.trim() || "No description added yet."}</p>
              </section>
            </div>

            <aside className={`${styles.card} ${styles.details}`} aria-labelledby="activity-overview-title">
              <h2 id="activity-overview-title">Overview</h2>
              <dl className={styles.metadata}>
                <div>
                  <dt><CalendarDays size={16} aria-hidden="true" />Created</dt>
                  <dd>{createdLabel}</dd>
                </div>
                <div>
                  <dt><FolderOpen size={16} aria-hidden="true" />Categories</dt>
                  <dd className={styles.categories}>
                    {activity.taggedCategories?.length ? activity.taggedCategories.map(category => (
                      <span key={category._id} className={styles.category}>{category.name}</span>
                    )) : <span className={styles.muted}>No categories assigned.</span>}
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
