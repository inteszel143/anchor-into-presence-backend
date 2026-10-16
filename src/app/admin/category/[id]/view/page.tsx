"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import styles from "../../category-form.module.css";
import { getImageUrl } from "@/lib/getImageUrl";

type Category = {
  _id: string;
  name: string;
};

type Activity = {
  _id: string;
  name: string;
  description: string;
  video: string;
  taggedCategories: Category[];
  createdAt: string;
  status: number;
};

export default function ActivityDetailsPage() {
  const { id } = useParams();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetch(`/api/admin/category/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error("Category could not load");
        setActivity(data.category);
      } catch (err) {
        console.error("Failed to fetch activity", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [id]);

  if (loading) return <div className={styles.page}><p className={styles.state} role="status">Loading category…</p></div>;
  if (!activity) return <div className={styles.page}><p className={styles.state} role="alert">Category unavailable. Please reload the page.</p><Link className={styles.back} href="/admin/category">Back to categories</Link></div>;

  return (
    <div className={styles.page}>
      <Link href="/admin/category" className={styles.back}><ArrowLeft size={16} aria-hidden="true" />Back to categories</Link>
      <div className={styles.heading}><p className={styles.eyebrow}>Library organization</p><h1>{activity.name || "Untitled category"}</h1><p>Category overview</p></div>
      <section className={styles.card} aria-label="Category details">
        <div className={styles.cardHeading}><h2>Description</h2><Link href={`/admin/category/${id}/edit`} className={styles.edit}><Pencil size={15} aria-hidden="true" />Edit category</Link></div>
        <div className={styles.fields}><p className={styles.description}>{activity.description || "No description added."}</p>
          {activity.video && <video className={styles.video} src={getImageUrl(activity.video)} controls />}
        </div>
        <div className={styles.footer}><span>Created {new Date(activity.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span><span className={`${styles.status} ${activity.status !== 1 ? styles.inactive : ""}`}>{activity.status === 1 ? "Active" : "Inactive"}</span></div>
      </section>
    </div>
  );
}
