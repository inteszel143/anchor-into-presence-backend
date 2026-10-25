"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/** Progressively enhance visible content; never hide it while waiting for JS. */
export default function ScrollReveal({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = root.current;
    if (!container || !("IntersectionObserver" in window)) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (motion.matches || typeof entry.target.animate !== "function" || entry.target.contains(document.activeElement)) continue;
        const direction = (entry.target as HTMLElement).dataset.reveal;
        const startTransform = direction === "right"
          ? "translateX(28px)"
          : direction === "up" ? "translateY(20px)" : "translateX(-28px)";
        const animation = entry.target.animate(
          [
            { opacity: 0, transform: startTransform },
            { opacity: 1, transform: "translate(0, 0)" },
          ],
          {
            duration: 650,
            delay: Number((entry.target as HTMLElement).dataset.revealDelay || 0),
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "backwards",
          },
        );
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      }
    }, { threshold: 0.08 });

    container.querySelectorAll("[data-reveal]").forEach(element => observer.observe(element));
    function stopAnimations() {
      animations.forEach(animation => animation.cancel());
      animations.clear();
    }
    function handleMotionChange() {
      if (motion.matches) stopAnimations();
    }
    // Keyboard focus should always reveal controls immediately.
    container.addEventListener("focusin", stopAnimations);
    motion.addEventListener("change", handleMotionChange);
    return () => {
      observer.disconnect();
      stopAnimations();
      container.removeEventListener("focusin", stopAnimations);
      motion.removeEventListener("change", handleMotionChange);
    };
  }, []);

  return <div ref={root} className={className} data-public-page>{children}</div>;
}
