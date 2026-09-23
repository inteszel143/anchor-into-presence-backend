"use client";

import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showSidebar = pathname !== "/admin/login";

  if (!showSidebar) {
    // Show only the content (e.g., for login page)
    return <div>{children}</div>;
  }

  return (
    <div className="admin-layout">
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
  );
}
 