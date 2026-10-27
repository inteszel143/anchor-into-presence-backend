"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/app/landing.module.css";

const tabs = [
  { id: "main", label: "Home" },
  { id: "experience", label: "The experience" },
  { id: "pricing", label: "Pricing" },
  { id: "questions", label: "FAQs" },
  { id: "begin", label: "Download" },
];

export default function LandingNavigation() {
  const [active, setActive] = useState("main");
  const nav = useRef<HTMLElement>(null);
  const pending = useRef<string | null>(null);

  useEffect(() => {
    let frame = 0;
    let settled: ReturnType<typeof setTimeout> | undefined;
    function updateFromScroll() {
      if (pending.current) return;
      const header = nav.current?.closest("header");
      const marker = (header?.getBoundingClientRect().bottom ?? 120) + 60;
      let current = "main";
      for (const tab of tabs) {
        const section = document.getElementById(tab.id);
        if (section && section.getBoundingClientRect().top <= marker) current = tab.id;
      }
      setActive(current);
    }
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateFromScroll);
      clearTimeout(settled);
      settled = setTimeout(() => {
        pending.current = null;
        updateFromScroll();
      }, 180);
    }
    function handleHash() {
      const id = window.location.hash.slice(1);
      if (tabs.some(tab => tab.id === id)) {
        pending.current = id;
        setActive(id);
      }
      schedule();
    }
    handleHash();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", handleHash);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settled);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", handleHash);
    };
  }, []);

  return <nav ref={nav} aria-label="Main navigation">
    {tabs.map(tab => <a
      key={tab.id}
      href={`#${tab.id}`}
      className={active === tab.id ? styles.navHome : undefined}
      aria-current={active === tab.id ? "location" : undefined}
      onClick={event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        setActive(tab.id);
      }}
    >{tab.label}</a>)}
  </nav>;
}
