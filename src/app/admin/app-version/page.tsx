"use client";

import { useEffect, useState } from "react";
import { Check, CircleAlert, Save, Smartphone } from "lucide-react";
import { toast } from "react-toastify";
import styles from "./app-version.module.css";

type VersionSettings = {
  android_version: string;
  ios_version: string;
  android_is_approved: boolean;
  ios_is_approved: boolean;
  is_under_maintenance: boolean;
};

const EMPTY_SETTINGS: VersionSettings = {
  android_version: "",
  ios_version: "",
  android_is_approved: false,
  ios_is_approved: false,
  is_under_maintenance: false,
};

export default function AppVersionPage() {
  const [settings, setSettings] = useState(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    async function loadSettings() {
      try {
        const response = await fetch("/api/admin/app-version", {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Couldn’t load app version settings.");
        if (!controller.signal.aborted) setSettings({ ...EMPTY_SETTINGS, ...result.settings });
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Couldn’t load app version settings.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadSettings();
    return () => controller.abort();
  }, [attempt]);

  function update<K extends keyof VersionSettings>(key: K, value: VersionSettings[K]) {
    setSettings(previous => ({ ...previous, [key]: value }));
  }

  async function saveSettings() {
    if (loading || saving || error) return;
    setSaving(true);
    toast.dismiss();
    try {
      const response = await fetch("/api/admin/app-version", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Couldn’t save app version settings.");
      setSettings({ ...EMPTY_SETTINGS, ...result.settings });
      toast.success("App version settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t save app version settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>App settings</p>
        <h1>App versions</h1>
        <p className={styles.subtitle}>Manage the release version and approval status for each mobile platform.</p>
      </header>

      <section className={styles.card} aria-labelledby="platforms-heading" aria-busy={loading}>
        <div className={styles.cardHeading}>
          <div className={styles.headingIcon}><Smartphone size={21} aria-hidden="true" /></div>
          <div><h2 id="platforms-heading">Platform releases</h2><p>Set the version currently approved for each app store.</p></div>
        </div>

        {loading ? <div className={styles.state} role="status">Loading app settings…</div>
          : error ? <div className={styles.state} role="alert"><CircleAlert size={28} aria-hidden="true" /><h3>Settings couldn’t load</h3><p>{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button></div>
          : <>
            <div className={styles.platforms}>
              <section className={styles.platform} aria-labelledby="android-heading">
                <div className={styles.platformHeading}><h3 id="android-heading">Android</h3><span>Google Play</span></div>
                <label className={styles.field}>
                  <span>Android version</span>
                  <input value={settings.android_version} onChange={event => update("android_version", event.target.value)} placeholder="e.g. 1.2.0" maxLength={32} autoComplete="off" spellCheck={false} disabled={saving} />
                </label>
                <label className={styles.toggle}>
                  <input type="checkbox" checked={settings.android_is_approved} onChange={event => update("android_is_approved", event.target.checked)} disabled={saving} />
                  <span className={styles.toggleText}><strong>Approved</strong><small>Mark this Android release as approved.</small></span>
                  <span className={styles.switch} aria-hidden="true" />
                </label>
              </section>

              <section className={styles.platform} aria-labelledby="ios-heading">
                <div className={styles.platformHeading}><h3 id="ios-heading">iOS</h3><span>App Store</span></div>
                <label className={styles.field}>
                  <span>iOS version</span>
                  <input value={settings.ios_version} onChange={event => update("ios_version", event.target.value)} placeholder="e.g. 1.2.0" maxLength={32} autoComplete="off" spellCheck={false} disabled={saving} />
                </label>
                <label className={styles.toggle}>
                  <input type="checkbox" checked={settings.ios_is_approved} onChange={event => update("ios_is_approved", event.target.checked)} disabled={saving} />
                  <span className={styles.toggleText}><strong>Approved</strong><small>Mark this iOS release as approved.</small></span>
                  <span className={styles.switch} aria-hidden="true" />
                </label>
              </section>
            </div>

            <label className={`${styles.toggle} ${styles.maintenance}`}>
              <input type="checkbox" checked={settings.is_under_maintenance} onChange={event => update("is_under_maintenance", event.target.checked)} disabled={saving} />
              <span className={styles.toggleText}><strong>Maintenance mode</strong><small>Mark the app as under maintenance.</small></span>
              <span className={styles.switch} aria-hidden="true" />
            </label>
          </>}

        <footer className={styles.footer}>
          <p>Changes take effect when saved.</p>
          <button type="button" className={styles.save} onClick={saveSettings} disabled={loading || saving || Boolean(error)}>
            {saving ? <><Save size={17} aria-hidden="true" />Saving…</> : <><Check size={17} aria-hidden="true" />Save changes</>}
          </button>
        </footer>
      </section>
    </div>
  );
}
