"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Bell, FolderOpen, LifeBuoy, Plus, Users } from "lucide-react";
import styles from "./dashboard.module.css";

type RecentUser = { _id: string; name: string; email: string; createdAt: string };
type Overview = { users: number; activities: number; categories: number; support: number; recentUsers: RecentUser[] };

const metrics = [
  { key: "users", label: "Registered users", href: "/admin/users", icon: Users },
  { key: "activities", label: "Activities", href: "/admin/activities", icon: Activity },
  { key: "categories", label: "Categories", href: "/admin/category", icon: FolderOpen },
  { key: "support", label: "Support tickets", href: "/admin/support", icon: LifeBuoy },
] as const;

const actions = [
  { label: "Create an activity", description: "Add a new experience to your library.", href: "/admin/activities/create", icon: Plus },
  { label: "Send a notification", description: "Share a reminder with your community.", href: "/admin/notification", icon: Bell },
  { label: "Manage support", description: "Review questions and help your members.", href: "/admin/support", icon: LifeBuoy },
];

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    async function loadOverview() {
      try {
        const [users, activities, categories, support] = await Promise.all([
          "/api/admin/users?limit=5",
          "/api/admin/activities?limit=1",
          "/api/admin/category?limit=1",
          "/api/admin/support?limit=1",
        ].map(async (url) => {
          const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
          if (!response.ok) throw new Error("We couldn’t load the dashboard. Please try again.");
          return response.json();
        }));
        if (!controller.signal.aborted) {
          setOverview({ users: users.total, activities: activities.pagination.total, categories: categories.pagination.total, support: support.total, recentUsers: users.users });
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "We couldn’t load the dashboard.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadOverview();
    return () => controller.abort();
  }, [refresh]);

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Overview</p>
        <h1>Dashboard</h1>
        <p>A look at your community and the content that brings them back.</p>
      </div>

      {error && <div className={styles.error} role="alert"><span>{error}</span><button type="button" onClick={() => setRefresh(value => value + 1)}>Try again</button></div>}
      <div className={styles.metrics} aria-busy={loading}>
        {metrics.map(({ key, label, href, icon: Icon }) => (
          <Link key={key} href={href} className={styles.metric}>
            <span className={styles.icon}><Icon size={21} aria-hidden="true" /></span>
            <span className={styles.metricLabel}>{label}</span>
            <strong>{loading || error || !overview ? "—" : overview[key].toLocaleString()}</strong>
            <span className={styles.metricLink}>View {key === "support" ? "tickets" : key}<ArrowRight size={15} aria-hidden="true" /></span>
          </Link>
        ))}
      </div>

      <div className={styles.columns}>
        <section className={styles.card} aria-labelledby="recent-users-heading" aria-busy={loading}>
          <div className={styles.cardHeading}><h2 id="recent-users-heading">Recent users</h2><Link href="/admin/users">View all <ArrowRight size={15} aria-hidden="true" /></Link></div>
          {loading ? <div className={styles.empty} role="status">Loading your community…</div> : error ? <div className={styles.empty}>Recent users are unavailable. Try loading the dashboard again.</div> : !overview?.recentUsers.length ? <div className={styles.empty}><Users size={28} aria-hidden="true" /><h3>Your community starts here</h3><p>Newly registered users will appear here.</p></div> : (
            <ul className={styles.userList}>
              {overview.recentUsers.map(user => (
                <li key={user._id}>
                  <span className={styles.avatar} aria-hidden="true">{(user.name || user.email || "U").charAt(0).toUpperCase()}</span>
                  <div className={styles.identity}><strong>{user.name || "Unnamed user"}</strong><span>{user.email}</span></div>
                  <span className={styles.date}>Joined {formatDate(user.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.card} aria-labelledby="quick-actions-heading">
          <div className={styles.cardHeading}><h2 id="quick-actions-heading">Quick actions</h2></div>
          <div className={styles.actions}>
            {actions.map(({ label, description, href, icon: Icon }) => (
              <Link key={href} href={href} className={styles.action}>
                <span className={styles.icon}><Icon size={19} aria-hidden="true" /></span>
                <div><strong>{label}</strong><p>{description}</p></div>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
