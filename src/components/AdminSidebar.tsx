"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  User,
  LayoutDashboard,
  Activity,
  ChartBarStacked,
  FileTerminal,
  FileQuestionMark,
  BellElectricIcon,
  BriefcaseMedical,
} from "lucide-react";

/**
 * Navigation links for static admin sidebar items.
 */
const staticLinks = [
  { label: "Users", href: "/admin/users", icon: <User /> },
  { label: "Content", href: "/admin/content", icon: <FileTerminal /> },
  { label: "FAQ", href: "/admin/faq", icon: <FileQuestionMark /> },
  { label: "Support", href: "/admin/support", icon: <BriefcaseMedical /> },
  { label: "Notifications", href: "/admin/notification", icon: <BellElectricIcon /> },
];

/**
 * Collapsible menu definitions for sectioned navigation.
 */
const collapsibleMenus = [
  {
    id: "navActivity",
    label: "Activity",
    icon: <Activity />,
    links: [
      { label: "List Activity", href: "/admin/activities" },
    ],
  },
  {
    id: "navCategory",
    label: "Category",
    icon: <ChartBarStacked />,
    links: [
      { label: "List Category", href: "/admin/category" },
    ],
  },
];

/**
 * Admin Sidebar Navigation Component
 * Rendered on the left side of the admin dashboard layout.
 */
export default function AdminSidebar() {
  const pathname = usePathname();

  const isSubMenuActive = (menuLinks: { href: string }[]) =>
    menuLinks.some((link) => pathname.startsWith(link.href));

  return (
    <>
      <div className="side-navbar">
        <button className="closeBtn">
          <i className="fa-solid fa-times" />
        </button>

        <div className="sidebar-logo">
          <Link className="logo" href="/admin/users">
            <Image
              src="/assets/images/logo_image.svg"
              alt="Logo"
              width={1}
              height={1}
            />
          </Link>
        </div>

        <div className="side_menu_wrapper">
          <div className="sidemenu_list">
            <ul className="nav flex-column position-relative" id="sidebar-nav">
              {/* Static Nav Links */}
              {staticLinks.map(({ label, href, icon }) => (
                <li className="sidebar-link" key={href}>
                  <Link
                    className={`nav-link ${pathname === href ? "active" : ""}`}
                    href={href}
                  >
                    <span className="menu-icon">{icon}</span>
                    <span className="menu_text">{label}</span>
                  </Link>
                </li>
              ))}

              {/* Collapsible Menus */}
              {collapsibleMenus.map(({ id, label, icon, links }) => {
                const active = isSubMenuActive(links);
                return (
                  <li className="sidebar-link" key={id}>
                    <a
                      className={`nav-link ${active ? "" : "collapsed"}`}
                      data-bs-toggle="collapse"
                      href={`#${id}`}
                      role="button"
                      aria-expanded={active}
                      aria-controls={id}
                    >
                      <span className="menu-icon">{icon}</span>
                      <span className="menu_text">{label}</span>
                    </a>
                    <div
                      className={`collapse ${active ? "show" : ""}`}
                      id={id}
                      data-bs-parent="#sidebar-nav"
                    >
                      <ul className="sub-menu-list">
                        {links.map(({ label, href }) => (
                          <li key={href}>
                            <Link
                              href={href}
                              className={pathname === href ? "active" : ""}
                            >
                              {label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
