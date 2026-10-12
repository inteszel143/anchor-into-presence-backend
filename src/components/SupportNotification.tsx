"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import styles from "./SupportNotification.module.css";

export default function SupportNotification() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    let controller: AbortController | undefined;
    async function refresh() {
      if (document.visibilityState === "hidden") return;
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const response = await fetch("/api/admin/support/unresolved-count", {
          cache: "no-store", signal: request.signal,
        });
        if (!response.ok) throw new Error("Count unavailable");
        const data = await response.json();
        if (!Number.isSafeInteger(data.count) || data.count < 0) throw new Error("Invalid count");
        if (active && !request.signal.aborted) setCount(data.count);
      } catch {
        if (active && !request.signal.aborted) setCount(null);
      }
    }
    void refresh();
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("support-updated", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("support-updated", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const label = count === null ? "Support requests" : `Support requests: ${count} unresolved`;
  return (
    <Link href="/admin/support" className={styles.notification} aria-label={label} title={label}>
      <Bell size={22} aria-hidden="true" />
      {count !== null && count > 0 && <span className={styles.badge} aria-hidden="true">{count}</span>}
    </Link>
  );
}
