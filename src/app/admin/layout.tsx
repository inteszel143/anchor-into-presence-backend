"use client";

import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import AdminNavigationProvider from "@/components/AdminNavigationProvider";
import styles from "./admin-layout.module.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showSidebar = pathname !== "/admin/login";

  if (!showSidebar) {
    // Show only the content (e.g., for login page)
    return <AdminNavigationProvider><div className={styles.theme}>{children}</div></AdminNavigationProvider>;
  }

  return (
    <AdminNavigationProvider>
    <div className={`admin-layout ${styles.theme} ${styles.layout}`}>
      <AdminSidebar />
      <div className="main-wrapper">
        <AdminHeader />
        <div className="content-wrapper">

          <section className="main-section spacer">
            {children}
          </section>
        </div>
      </div>
    </div>
    </AdminNavigationProvider>
  );
}
