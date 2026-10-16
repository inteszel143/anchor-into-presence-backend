"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FolderOpen } from "lucide-react";
import styles from "../category-form.module.css";
import { toast } from "react-toastify";

export default function CreateActivityPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    toast.dismiss();
      toast.clearWaitingQueue();
    if (!name || !description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {


    const res = await fetch("/api/admin/category/create", {
      method: "POST",
      body: JSON.stringify({ name, description }),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      toast.success("Category created successfully");
      router.push("/admin/category"); // Redirect to list page
    } else {
      const data = await res.json();
      toast.error(
        data.message || "Something went wrong while updating category status"
      );
    }

    } catch {
      toast.error("Unable to save. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Link href="/admin/category" className={styles.back}><ArrowLeft size={16} aria-hidden="true" />Back to categories</Link>
      <div className={styles.heading}><p className={styles.eyebrow}>Library organization</p><h1>Create category</h1><p>Give your community a clear path to the experiences they need.</p></div>
      <section className={styles.card} aria-labelledby="category-details-heading">
        <div className={styles.cardHeading}><FolderOpen size={22} aria-hidden="true" /><div><h2 id="category-details-heading">Category details</h2><p>A name and description to bring your library together.</p></div></div>
        <form onSubmit={handleSubmit}>
          <div className={styles.fields}>
            <label htmlFor="category-name">Category name<input id="category-name" type="text" value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Mindful mornings" required /></label>
            <label htmlFor="category-description">Description<textarea id="category-description" rows={6} value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe what members will discover in this category." required /></label>
          </div>
          <div className={styles.footer}><span>Both fields are required.</span><div><Link href="/admin/category" className={styles.cancel}>Cancel</Link><button type="submit" disabled={loading}>{loading ? "Saving…" : "Create category"}</button></div></div>
        </form>
      </section>
    </div>
  );
}
