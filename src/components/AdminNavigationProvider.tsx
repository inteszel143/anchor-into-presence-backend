"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

type NavigationOptions = { replace?: boolean; scroll?: boolean };
const NavigationContext = createContext<((href: string, options: NavigationOptions) => void) | null>(null);

export function useAdminNavigation() {
  const navigate = useContext(NavigationContext);
  if (!navigate) throw new Error("Admin navigation requires AdminNavigationProvider");
  return navigate;
}

export default function AdminNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  function navigate(href: string, options: NavigationOptions) {
    if (options.replace) router.replace(href, { scroll: options.scroll });
    else router.push(href, { scroll: options.scroll });
  }

  return <NavigationContext.Provider value={navigate}>
    {children}
  </NavigationContext.Provider>;
}
