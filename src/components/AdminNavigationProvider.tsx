"use client";

import { createContext, useContext, useRef, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import AdminTabLoader from "./AdminTabLoader";
import styles from "./AdminNavigationLoading.module.css";

type NavigationOptions = { replace?: boolean; scroll?: boolean };
const NavigationContext = createContext<((href: string, options: NavigationOptions) => void) | null>(null);

export function useAdminNavigation() {
  const navigate = useContext(NavigationContext);
  if (!navigate) throw new Error("Admin navigation requires AdminNavigationProvider");
  return navigate;
}

export default function AdminNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigationId = useRef(0);

  function navigate(href: string, options: NavigationOptions) {
    const id = ++navigationId.current;
    startTransition(async () => {
      // Keep the requested loading transition visible even for prefetched pages.
      await new Promise(resolve => setTimeout(resolve, 650));
      if (id !== navigationId.current) return;
      startTransition(() => {
        if (options.replace) router.replace(href, { scroll: options.scroll });
        else router.push(href, { scroll: options.scroll });
      });
    });
  }

  return <NavigationContext.Provider value={navigate}>
    <AdminTabLoader active={pending} />
    {children}
    {pending && <div className={styles.progress} role="status" aria-label="Loading page"><span /></div>}
  </NavigationContext.Provider>;
}
