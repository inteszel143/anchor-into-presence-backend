"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import styles from "@/app/landing.module.css";

const storageKey = "anchor-public-theme";
type Theme = "light" | "dark";

export default function ThemeToggle() {
  const button = useRef<HTMLButtonElement>(null);
  const chosen = useRef(false);
  const [theme, setTheme] = useState<Theme>("light");

  function apply(next: Theme) {
    const page = button.current?.closest<HTMLElement>("[data-public-page]");
    if (page) page.dataset.theme = next;
    setTheme(next);
  }

  useEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    let saved: string | null = null;
    try { saved = localStorage.getItem(storageKey); } catch { /* Storage may be disabled. */ }
    chosen.current = saved === "light" || saved === "dark";
    apply(saved === "light" || saved === "dark" ? saved : system.matches ? "dark" : "light");
    const followSystem = () => { if (!chosen.current) apply(system.matches ? "dark" : "light"); };
    const sync = (event: StorageEvent) => {
      if (event.key !== storageKey && event.key !== null) return;
      chosen.current = event.newValue === "light" || event.newValue === "dark";
      apply(event.newValue === "light" || event.newValue === "dark" ? event.newValue : system.matches ? "dark" : "light");
    };
    system.addEventListener("change", followSystem);
    window.addEventListener("storage", sync);
    return () => {
      system.removeEventListener("change", followSystem);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const label = `Switch to ${theme === "dark" ? "light" : "dark"} mode`;
  return <button ref={button} type="button" className={styles.themeToggle} aria-label={label} title={label} onClick={() => {
    const next = theme === "dark" ? "light" : "dark";
    chosen.current = true;
    apply(next);
    try { localStorage.setItem(storageKey, next); } catch { /* Keep the toggle usable without storage. */ }
  }}>{theme === "dark" ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}</button>;
}
