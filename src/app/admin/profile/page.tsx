"use client";

import { useEffect, useRef, useState } from "react";
import Link from "@/components/AdminLink";
import { Camera, Check, ChevronRight, KeyRound, LockKeyhole, Save, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "react-toastify";
import { getImageUrl } from "@/lib/getImageUrl";
import styles from "./profile.module.css";

type Profile = { name: string; email: string; image: string };

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    async function load() {
      try {
        const res = await fetch("/api/admin/profile", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "We couldn’t load your profile.");
        if (controller.signal.aborted) return;
        const loaded = { name: data.name || "", email: data.email || "", image: data.image || "" };
        setProfile(loaded);
        setName(loaded.name);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "We couldn’t load your profile.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    if (!imageFile) { setPreview(""); return; }
    const url = URL.createObjectURL(imageFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const changed = Boolean(profile && (name.trim() !== profile.name || imageFile));
  const image = preview || getImageUrl(profile?.image);
  const initials = (name.trim() || "Admin").split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();

  function discardChanges() {
    setName(profile?.name || "");
    setImageFile(null);
    if (fileRef.current) fileRef.current.value = "";
    setError("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!profile || saving || !changed || !name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("email", profile.email);
      if (imageFile) form.append("image", imageFile);
      const res = await fetch("/api/admin/profile", { method: "PUT", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Couldn’t save your profile. Please try again.");
      const saved = { ...profile, name: name.trim(), image: data.image || profile.image };
      setProfile(saved);
      setName(saved.name);
      setImageFile(null);
      if (fileRef.current) fileRef.current.value = "";
      localStorage.setItem("name", saved.name);
      localStorage.setItem("email", saved.email);
      localStorage.setItem("image", saved.image);
      window.dispatchEvent(new Event("storage"));
      toast.success("Profile updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t save your profile. Please try again.");
    } finally { setSaving(false); }
  }

  return <div className={styles.page}>
    <header className={styles.heading}><p className={styles.eyebrow}>Your workspace</p><h1>My profile</h1><p>Manage your personal details and how you appear in the admin panel.</p></header>
    {loading ? <div className={styles.state} role="status">Loading your profile…</div> : !profile ? <div className={styles.state} role="alert"><UserRound size={30} aria-hidden="true" /><h2>Profile unavailable</h2><p>{error}</p><button className={styles.secondary} onClick={() => setRefresh(value => value + 1)}>Try again</button></div> : <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <section className={styles.identity} aria-label="Profile summary">
          <div className={styles.cover} />
          <div className={styles.avatar}>{image ? <img src={image} alt="Your profile" /> : <span>{initials}</span>}</div>
          <h2>{name.trim() || "Your name"}</h2><p className={styles.email}>{profile.email}</p>
          <span className={styles.role}><ShieldCheck size={14} aria-hidden="true" />Administrator</span>
          <p className={styles.identityNote}>Your profile for managing the Anchor Into Presence community.</p>
        </section>
        <section className={styles.security}><span className={styles.sectionIcon}><KeyRound size={20} aria-hidden="true" /></span><h2>Account security</h2><p>Keep your account secure with a strong, unique password.</p><Link href="/admin/reset-password">Change password<ChevronRight size={16} aria-hidden="true" /></Link></section>
      </aside>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.cardHeading}><span className={styles.sectionIcon}><UserRound size={22} aria-hidden="true" /></span><div><h2>Personal information</h2><p>A few details to make your workspace feel like you.</p></div></div>
        <fieldset className={styles.fields} disabled={saving}>
          <legend className={styles.srOnly}>Edit your profile</legend>
          <div className={styles.photoSection}><div><h3>Profile photo</h3><p>Choose a photo that helps your team recognize you.</p></div><div className={styles.photoActions}><input ref={fileRef} className={styles.srOnly} type="file" id="profile-photo" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (file && !file.type.startsWith("image/")) { setError("Please choose an image file."); event.target.value = ""; return; } if (file) { setImageFile(file); setError(""); } }} /><button className={styles.secondary} type="button" onClick={() => fileRef.current?.click()}><Camera size={16} aria-hidden="true" />Change photo</button>{imageFile && <span className={styles.fileName}>{imageFile.name}</span>}</div></div>
          <div className={styles.field}><label htmlFor="profile-name">Full name</label><input id="profile-name" autoComplete="name" value={name} required onChange={event => setName(event.target.value)} placeholder="Enter your name" /><p>This name appears in your admin profile and header.</p></div>
          <div className={styles.field}><label htmlFor="profile-email">Email address<span><LockKeyhole size={12} aria-hidden="true" />Read only</span></label><input id="profile-email" type="email" autoComplete="email" value={profile.email} readOnly aria-describedby="profile-email-hint" /><p id="profile-email-hint">Your sign-in email can’t be changed here.</p></div>
        </fieldset>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <footer className={styles.footer}><p aria-live="polite">{saving ? "Saving your changes…" : changed ? "You have unsaved changes" : <><Check size={15} aria-hidden="true" />Your profile is up to date</>}</p><div><button className={styles.secondary} type="button" disabled={!changed || saving} onClick={discardChanges}>Cancel</button><button className={styles.primary} type="submit" disabled={!changed || saving || !name.trim()}><Save size={16} aria-hidden="true" />{saving ? "Saving…" : "Save changes"}</button></div></footer>
      </form>
    </div>}
  </div>;
}
