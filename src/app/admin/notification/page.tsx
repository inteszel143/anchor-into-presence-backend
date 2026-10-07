"use client";

import { useState } from "react";
import { Bell, Info, LoaderCircle, Send, Users } from "lucide-react";
import { toast } from "react-toastify";
import styles from "./notification.module.css";

export default function SendNotificationPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    toast.dismiss();
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in both title and description.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/notification/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Notification sent successfully.");
        setTitle("");
        setDescription("");
      } else {
        toast.error(data.message || "Failed to send notification");
      }
    } catch {
      toast.error("Unable to confirm delivery. Check your connection before trying again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Communication</p>
        <h1>Notifications</h1>
        <p className={styles.subtitle}>Share a thoughtful reminder or an important update with your community.</p>
      </div>

      <div className={styles.layout}>
        <section className={styles.card} aria-labelledby="compose-heading">
          <div className={styles.cardHeader}>
            <span className={styles.icon}><Send size={20} aria-hidden="true" /></span>
            <div>
              <h2 id="compose-heading">Create notification</h2>
              <p>Write your message and review it before sending.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} aria-busy={loading}>
            <div className={styles.formBody}>
              <div className={styles.audience}>
                <Users size={20} aria-hidden="true" />
                <div>
                  <span className={styles.smallLabel}>Audience</span>
                  <strong>Community notification</strong>
                  <p>Push notifications go to verified, unblocked users with notifications enabled and a registered device.</p>
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="notification-title">Notification title <span>Required</span></label>
                <input
                  id="notification-title"
                  name="title"
                  type="text"
                  placeholder="A moment of calm, just for you"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  aria-describedby="title-hint"
                  disabled={loading}
                  required
                />
                <p id="title-hint" className={styles.hint}>Keep it short and easy to understand at a glance.</p>
              </div>

              <div className={styles.field}>
                <label htmlFor="notification-description">Message <span>Required</span></label>
                <textarea
                  id="notification-description"
                  name="description"
                  rows={6}
                  placeholder="Take a deep breath and make a little space for yourself today. Your next meditation is waiting."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  aria-describedby="message-hint"
                  disabled={loading}
                  required
                />
                <div className={styles.fieldFooter}>
                  <p id="message-hint" className={styles.hint}>Give your community a clear reason to open the app.</p>
                  <span>{description.length} characters</span>
                </div>
              </div>
            </div>

            <div className={styles.formFooter}>
              <p><Info size={16} aria-hidden="true" /> Sends immediately when you’re ready.</p>
              <button type="submit" disabled={loading}>
                {loading ? <LoaderCircle size={17} className={styles.spinner} aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
                {loading ? "Sending…" : "Send notification"}
              </button>
            </div>
          </form>
        </section>

        <aside className={styles.previewColumn} aria-labelledby="preview-heading">
          <section className={styles.previewPanel}>
            <div className={styles.previewHeader}>
              <h2 id="preview-heading">Live preview</h2>
              <span>Push notification</span>
            </div>
            <div className={styles.previewSurface}>
              <div className={styles.notification}>
                <div className={styles.appIdentity}>
                  <span className={styles.appIcon}><Bell size={16} aria-hidden="true" /></span>
                  <span>Anchor Into Presence</span>
                  <span className={styles.timestamp}>now</span>
                </div>
                <h3 className={!title.trim() ? styles.placeholder : undefined}>{title.trim() || "Your notification title"}</h3>
                <p className={!description.trim() ? styles.placeholder : undefined}>{description.trim() || "Your message will appear here as you type. Make it warm, clear, and meaningful."}</p>
              </div>
            </div>
            <p className={styles.previewNote}>An example of how your message may appear. Appearance varies by device.</p>
          </section>
          <section className={styles.tips} aria-labelledby="tips-heading">
            <h2 id="tips-heading">A little intention goes a long way</h2>
            <ul>
              <li>Lead with what matters most.</li>
              <li>Use a warm, welcoming tone.</li>
              <li>Check your message before sending.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
