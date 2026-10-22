"use client";

import { useRef, useState } from "react";
import Link from "@/components/AdminLink";
import { ArrowLeft, Check, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import shared from "../profile/profile.module.css";
import styles from "./reset-password.module.css";

type Field = "current" | "new" | "confirm";

export default function ChangePassword() {
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [visible, setVisible] = useState({ current: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const lengthMet = passwords.new.length >= 8;
  const matches = Boolean(passwords.confirm && passwords.confirm === passwords.new);

  function showError(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!lengthMet) { showError("Your new password must be at least 8 characters."); return; }
    if (!matches) { showError("The new passwords don’t match. Please check and try again."); return; }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.new }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Couldn’t update your password. Please try again.");
      setPasswords({ current: "", new: "", confirm: "" });
      setVisible({ current: false, new: false, confirm: false });
      setSuccess(true);
      requestAnimationFrame(() => successRef.current?.focus());
    } catch (err) {
      showError(err instanceof Error ? err.message : "Couldn’t update your password. Please try again.");
    } finally { setSaving(false); }
  }

  return <div className={shared.page}>
    <Link className={styles.back} href="/admin/profile"><ArrowLeft size={16} aria-hidden="true" />Back to profile</Link>
    <header className={shared.heading}><p className={shared.eyebrow}>Account security</p><h1>Change password</h1><p>Keep your admin account protected with a password only you know.</p></header>
    <div className={shared.layout}>
      <aside className={styles.guide}>
        <span className={styles.shield}><ShieldCheck size={30} strokeWidth={1.5} aria-hidden="true" /></span>
        <h2>A little care for your account</h2><p>A strong password helps protect your workspace and the community you manage.</p>
        <ul><li><Check size={16} aria-hidden="true" /><span>Use at least 8 characters.</span></li><li><Check size={16} aria-hidden="true" /><span>Choose a unique password you don’t use elsewhere.</span></li><li><Check size={16} aria-hidden="true" /><span>A longer phrase can be easier to remember.</span></li></ul>
        <div className={styles.guideNote}><LockKeyhole size={16} aria-hidden="true" /><p>You’ll need your current password to make this change.</p></div>
      </aside>
      {success ? <div ref={successRef} tabIndex={-1} className={`${shared.card} ${styles.success}`} role="status"><span className={styles.successIcon}><CheckCircle2 size={32} aria-hidden="true" /></span><h2>Password updated</h2><p>Your new password is ready to use the next time you sign in.</p><Link className={shared.primary} href="/admin/profile">Back to profile</Link></div> : <form className={shared.card} onSubmit={handleSubmit} aria-busy={saving}>
        <div className={shared.cardHeading}><span className={shared.sectionIcon}><KeyRound size={22} aria-hidden="true" /></span><div><h2>Update your password</h2><p>Enter your current password, then choose a new one.</p></div></div>
        <fieldset className={shared.fields} disabled={saving}>
          <legend className={shared.srOnly}>Password details</legend>
          {([{ key: "current", label: "Current password", placeholder: "Enter current password" }, { key: "new", label: "New password", placeholder: "Create a new password" }, { key: "confirm", label: "Confirm new password", placeholder: "Re-enter your new password" }] as const).map(({ key, label, placeholder }) => <div className={shared.field} key={key}>
            <label htmlFor={`password-${key}`}>{label}</label>
            <div className={styles.passwordField}><input id={`password-${key}`} type={visible[key] ? "text" : "password"} autoComplete={key === "current" ? "current-password" : "new-password"} value={passwords[key]} onChange={event => { setPasswords(previous => ({ ...previous, [key]: event.target.value })); setError(""); }} required minLength={key === "current" ? undefined : 8} placeholder={placeholder} aria-describedby={key === "current" ? undefined : `password-${key}-hint`} /><button type="button" className={styles.visibility} aria-label={`${visible[key] ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible[key]} aria-controls={`password-${key}`} onClick={() => setVisible(previous => ({ ...previous, [key as Field]: !previous[key] }))}>{visible[key] ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></div>
            {key === "new" && <p id="password-new-hint" className={lengthMet ? styles.met : undefined}>{lengthMet && <Check size={13} aria-hidden="true" />}At least 8 characters</p>}
            {key === "confirm" && <p id="password-confirm-hint" className={matches ? styles.met : undefined} aria-live="polite">{matches ? <><Check size={13} aria-hidden="true" />Passwords match</> : passwords.confirm ? "Passwords don’t match yet." : "Enter the same password again to confirm."}</p>}
          </div>)}
        </fieldset>
        {error && <p ref={errorRef} tabIndex={-1} className={shared.error} role="alert">{error}</p>}
        <footer className={shared.footer}><p aria-live="polite"><LockKeyhole size={14} aria-hidden="true" />{saving ? "Updating your password…" : "Your account, kept secure"}</p><div>{saving ? <button className={shared.secondary} disabled>Cancel</button> : <Link className={`${shared.secondary} ${styles.actionLink}`} href="/admin/profile">Cancel</Link>}<button type="submit" className={shared.primary} disabled={saving}><KeyRound size={16} aria-hidden="true" />{saving ? "Updating…" : "Update password"}</button></div></footer>
      </form>}
    </div>
  </div>;
}
