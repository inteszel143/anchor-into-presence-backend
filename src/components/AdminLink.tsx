"use client";

import Link from "next/link";
import { useRef } from "react";
import type { ComponentProps } from "react";
import { useAdminNavigation } from "./AdminNavigationProvider";

export default function AdminLink({ children, onNavigate, ...props }: ComponentProps<typeof Link>) {
  const navigate = useAdminNavigation();
  const anchor = useRef<HTMLAnchorElement | null>(null);

  return <Link {...props} ref={element => {
    anchor.current = element;
    if (typeof props.ref === "function") props.ref(element);
    else if (props.ref) props.ref.current = element;
  }} onNavigate={event => {
    let cancelled = false;
    onNavigate?.({ preventDefault: () => { cancelled = true; event.preventDefault(); } });
    if (cancelled || !anchor.current) return;
    const target = new URL(anchor.current.href);
    if (target.pathname === window.location.pathname && target.search === window.location.search) return;
    event.preventDefault();
    navigate(`${target.pathname}${target.search}${target.hash}`, { replace: props.replace, scroll: props.scroll });
  }}>{children}</Link>;
}
