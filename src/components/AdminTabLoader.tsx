"use client";

import { useLayoutEffect } from "react";
import { acquireAdminTabIcon } from "@/lib/adminTabIcon";

export default function AdminTabLoader({ active = true }: { active?: boolean }) {
  // Suspense hides cached fallbacks without necessarily unmounting them.
  // Layout-effect cleanup releases their loading icon when they become hidden.
  useLayoutEffect(() => {
    if (active) return acquireAdminTabIcon();
  }, [active]);
  return null;
}
