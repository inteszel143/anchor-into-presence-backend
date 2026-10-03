"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Activity, Bell, ChevronRight, FileText, FolderOpen, HelpCircle, LayoutDashboard, LifeBuoy, Menu, Users, X } from "lucide-react";
import styles from "./AdminSidebar.module.css";

const sections = [
  { label: "Overview", links: [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Users", href: "/admin/users", icon: Users },
  ] },
  { label: "Library", links: [
    { label: "Activities", href: "/admin/activities", icon: Activity },
    { label: "Categories", href: "/admin/category", icon: FolderOpen },
    { label: "Content", href: "/admin/content", icon: FileText },
    { label: "FAQs", href: "/admin/faq", icon: HelpCircle },
  ] },
  { label: "Community", links: [
    { label: "Support", href: "/admin/support", icon: LifeBuoy },
    { label: "Notifications", href: "/admin/notification", icon: Bell },
  ] },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  function closeMenu() {
    setOpen(false);
    toggleRef.current?.focus();
  }

  return (
    <>
      <button ref={toggleRef} type="button" className={styles.toggle} aria-label="Open navigation" aria-controls="admin-sidebar" aria-expanded={open} onClick={() => setOpen(true)}>
        <Menu size={22} aria-hidden="true" />
      </button>
      {open && <button type="button" tabIndex={-1} className={styles.backdrop} aria-label="Close navigation" onClick={closeMenu} />}
      <aside id="admin-sidebar" className={`side-navbar ${styles.sidebar} ${open ? styles.open : ""}`} onKeyDown={event => { if (event.key === "Escape" && open) { event.preventDefault(); closeMenu(); } }}>
        <div className={styles.brand}>
          <Link href="/admin/dashboard" className={styles.brandLink} onClick={() => setOpen(false)} aria-label="Anchor Into Presence dashboard">
            <Image src="/assets/images/anchor-into-presence-logo.png" alt="" width={52} height={52} />
            <span><strong>Anchor Into Presence</strong><span>Admin workspace</span></span>
          </Link>
          <button type="button" className={styles.close} aria-label="Close navigation" onClick={closeMenu}><X size={20} aria-hidden="true" /></button>
        </div>

        <nav className={styles.navigation} aria-label="Admin navigation">
          {sections.map(section => (
            <div className={styles.section} key={section.label}>
              <h2>{section.label}</h2>
              <ul>
                {section.links.map(({ label, href, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <li key={href}>
                      <Link href={href} className={`${styles.link} ${active ? styles.active : ""}`} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>
                        <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                        <span>{label}</span>
                        {active && <ChevronRight size={15} className={styles.activeArrow} aria-hidden="true" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className={styles.footer}><span aria-hidden="true" /><p>A little more presence, every day.</p></div>
      </aside>
    </>
  );
}
