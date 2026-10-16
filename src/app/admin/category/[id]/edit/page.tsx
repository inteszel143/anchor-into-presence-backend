"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FolderOpen } from "lucide-react";
import styles from "../../category-form.module.css";
import { toast } from "react-toastify";

export default function EditActivityPage() {
  const { id } = useParams();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Fetch existing data
  useEffect(() => {
    const fetchActivity = async () => {
      setFetching(true);
      setLoadError("");
      try {
      const res = await fetch(`/api/admin/category/${id}`);
      if (!res.ok) throw new Error("Category could not load");
      const data = await res.json();
      const act = data.category;

      setName(act.name);
      setDescription(act.description);
      } catch {
        setLoadError("Couldn’t load this category. Reload the page to try again.");
      } finally { setFetching(false); }
    };

    fetchActivity();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || fetching || loadError) return;
          toast.dismiss()
      toast.clearWaitingQueue();
    toast.dismiss();
    if (!name || !description) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {



    const res = await fetch(`/api/admin/category/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name, description }),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      toast.success("Category updated successfully");
      router.push("/admin/category");
    } else {
      const data = await res.json();
      toast.error(data.message || "Failed to update category.");
    }

    } catch {
      toast.error("Unable to save. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className={styles.page}><p className={styles.state} role="status">Loading category…</p></div>;
  if (loadError) return <div className={styles.page}><p className={styles.state} role="alert">{loadError}</p><Link className={styles.back} href="/admin/category">Back to categories</Link></div>;

  return (
    <div className={styles.page}>
      <Link href="/admin/category" className={styles.back}><ArrowLeft size={16} aria-hidden="true" />Back to categories</Link>
      <div className={styles.heading}><p className={styles.eyebrow}>Library organization</p><h1>Edit category</h1><p>Give your community a clear path to the experiences they need.</p></div>
      <section className={styles.card} aria-labelledby="category-details-heading">
        <div className={styles.cardHeading}><FolderOpen size={22} aria-hidden="true" /><div><h2 id="category-details-heading">Category details</h2><p>A name and description to bring your library together.</p></div></div>
        <form onSubmit={handleSubmit}>
          <div className={styles.fields}>
            <label htmlFor="category-name">Category name<input id="category-name" type="text" value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Mindful mornings" required /></label>
            <label htmlFor="category-description">Description<textarea id="category-description" rows={6} value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe what members will discover in this category." required /></label>
          </div>
          <div className={styles.footer}><span>Both fields are required.</span><div><Link href="/admin/category" className={styles.cancel}>Cancel</Link><button type="submit" disabled={loading}>{loading ? "Saving…" : "Save changes"}</button></div></div>
        </form>
      </section>
    </div>
  );
}
