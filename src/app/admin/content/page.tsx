"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { FileText, Save, ShieldCheck } from "lucide-react";
import "react-quill-new/dist/quill.snow.css";
import { toast } from "react-toastify";
import styles from "./content.module.css";

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => <div className={styles.state} role="status">Loading editor…</div>,
});

type DocumentType = "terms" | "privacy";
type DocumentData = { id: string; description: string };
const documents = {
  terms: { title: "Terms & Conditions", description: "Set out the terms for using Anchor Into Presence.", icon: FileText },
  privacy: { title: "Privacy Policy", description: "Explain how personal information is collected, used, and protected.", icon: ShieldCheck },
};

export default function TermsPrivacyEditor() {
  const [content, setContent] = useState<Record<DocumentType, DocumentData>>({
    terms: { id: "", description: "" }, privacy: { id: "", description: "" },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [activeTab, setActiveTab] = useState<DocumentType>("terms");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    async function fetchData() {
      try {
        const results = await Promise.all((["terms", "privacy"] as const).map(async type => {
          const res = await fetch(`/api/admin/content/${type}`, { signal: controller.signal });
          if (!res.ok) throw new Error("We couldn’t load the documents. Please try again.");
          const data = await res.json();
          return { id: data?.data?._id || "", description: data?.data?.description || "" };
        }));
        if (!controller.signal.aborted) setContent({ terms: results[0], privacy: results[1] });
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "We couldn’t load the documents.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    fetchData();
    return () => controller.abort();
  }, [attempt]);

  async function handleSave() {
    const selected = content[activeTab];
    if (loading || saving || error) return;
    setSaving(true);
    toast.dismiss();
    try {
      const res = await fetch(selected.id ? `/api/admin/content/${selected.id}` : "/api/admin/content", {
        method: selected.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: selected.description, contentType: activeTab }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Couldn’t save your changes. Please try again.");
      setContent(previous => ({ ...previous, [activeTab]: { ...previous[activeTab], id: result.content._id } }));
      toast.success(`${documents[activeTab].title} saved successfully.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t save your changes.");
    } finally { setSaving(false); }
  }

  const current = content[activeTab];
  const document = documents[activeTab];
  const Icon = document.icon;

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Manage content</p>
        <h1>Content</h1>
        <p className={styles.subtitle}>Edit the legal documents available to your users.</p>
      </div>

      <section className={styles.card} aria-label="Legal documents">
        <div className={styles.tabs} role="tablist" aria-label="Legal documents">
          {(["terms", "privacy"] as const).map(type => {
            const TabIcon = documents[type].icon;
            return <button key={type} id={`document-tab-${type}`} role="tab" type="button" aria-selected={activeTab === type} aria-controls={`document-panel-${type}`} tabIndex={activeTab === type ? 0 : -1} disabled={saving} onClick={() => setActiveTab(type)} onKeyDown={event => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === "Home" ? "terms" : event.key === "End" ? "privacy" : type === "terms" ? "privacy" : "terms";
              setActiveTab(next);
              const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button[role="tab"]');
              buttons?.[next === "terms" ? 0 : 1]?.focus();
            }}><TabIcon size={18} aria-hidden="true" />{documents[type].title}</button>;
          })}
        </div>

        <div role="tabpanel" id={`document-panel-${activeTab}`} aria-labelledby={`document-tab-${activeTab}`} className={styles.panel}>
          <div className={styles.documentHeading}>
            <span className={styles.documentIcon}><Icon size={22} aria-hidden="true" /></span>
            <div><h2>{document.title}</h2><p>{document.description}</p></div>
          </div>

          {loading ? <div className={styles.state} role="status">Loading documents…</div>
            : error ? <div className={styles.state} role="alert"><FileText size={30} aria-hidden="true" /><h3>Documents couldn’t load</h3><p>{error}</p><button className={styles.retry} onClick={() => setAttempt(value => value + 1)}>Try again</button></div>
            : <div className={styles.editor} aria-label={`${document.title} editor`}>
              <ReactQuill key={activeTab} theme="snow" value={current.description} readOnly={saving} onChange={value => setContent(previous => ({ ...previous, [activeTab]: { ...previous[activeTab], description: value } }))} placeholder="Write your document here…" />
            </div>}
        </div>

        <div className={styles.footer}>
          <p>Changes are applied when you save this document.</p>
          <button type="button" className={styles.save} onClick={handleSave} disabled={loading || saving || Boolean(error)}>
            <Save size={17} aria-hidden="true" />{saving ? "Saving…" : activeTab === "terms" ? "Save terms" : "Save privacy policy"}
          </button>
        </div>
      </section>
    </div>
  );
}
