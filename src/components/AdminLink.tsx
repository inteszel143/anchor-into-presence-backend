"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { ComponentProps } from "react";
import { createPortal } from "react-dom";
import styles from "./AdminNavigationLoading.module.css";

export default function AdminLink({ children, onNavigate, ...props }: ComponentProps<typeof Link>) {
  const router = useRouter();
  const [delaying, setDelaying] = useState(false);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchor = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return <>
    <Link {...props} ref={element => {
      anchor.current = element;
      if (typeof props.ref === "function") props.ref(element);
      else if (props.ref) props.ref.current = element;
    }} onNavigate={event => {
      // Preserve callers that intentionally cancel navigation.
      let cancelled = false;
      onNavigate?.({ preventDefault: () => { cancelled = true; event.preventDefault(); } });
      if (cancelled || !anchor.current) return;
      const target = new URL(anchor.current.href);
      if (target.pathname === window.location.pathname && target.search === window.location.search) return;
      event.preventDefault();
      if (timer.current) clearTimeout(timer.current);
      setDelaying(true);
      timer.current = setTimeout(() => {
        timer.current = null;
        startTransition(() => {
          const href = `${target.pathname}${target.search}${target.hash}`;
          if (props.replace) router.replace(href, { scroll: props.scroll });
          else router.push(href, { scroll: props.scroll });
          setDelaying(false);
        });
      }, 350);
    }}>{children}</Link>
    {(delaying || pending) && createPortal(
      <div className={styles.overlay} role="status" aria-live="polite">
        <div className={styles.progress} aria-hidden="true"><span /></div>
        <div className={styles.loadingCard}><span className={styles.spinner} aria-hidden="true" /><span>Loading page…</span></div>
      </div>, document.body
    )}
  </>;
}
