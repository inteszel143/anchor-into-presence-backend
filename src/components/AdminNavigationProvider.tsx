"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

type NavigationOptions = { replace?: boolean; scroll?: boolean };
const NavigationContext = createContext<((href: string, options: NavigationOptions) => void) | null>(null);

export function useAdminNavigation() {
  const navigate = useContext(NavigationContext);
  if (!navigate) throw new Error("Admin navigation requires AdminNavigationProvider");
  return navigate;
}

export default function AdminNavigationProvider({ children }: { children: ReactNode }) {
  function navigate(href: string, options: NavigationOptions) {
    // Document navigation lets the browser own the tab's native loading spinner.
    if (options.replace) window.location.replace(href);
    else window.location.assign(href);
  }

  return <NavigationContext.Provider value={navigate}>
    {children}
  </NavigationContext.Provider>;
}
