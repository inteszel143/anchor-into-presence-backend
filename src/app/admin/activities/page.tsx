"use client";

import { Activity, ChevronLeft, ChevronRight, Eye, ImageIcon, Pencil, Plus, Search, Trash2, Video, X } from "lucide-react";
import Link from "next/link";
import { getActivityImage } from "@/lib/activityMedia";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import styles from "./activities.module.css";

type ActivityItem = {
  _id: string;
  name: string;
  status: number;
  scheduleDate?: string;
  video?: string;
  thumbnail?: string;
  contentType?: string;
  taggedCategoriesData?: { name: string }[];
};

function scheduleLabel(value?: string) {
  if (!value) return "Not scheduled";
  // Date-only schedules should not shift to the previous day in western time zones.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminActivitiesListPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sort, setSort] = useState("createdAt|desc");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    async function load() {
      try {
        const [sortBy, sortOrder] = sort.split("|");
        const params = new URLSearchParams({ search: query, startDate, endDate, sortBy, sortOrder, page: String(page), limit: String(limit) });
        const res = await fetch(`/api/admin/activities?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error("We couldn’t load activities. Please try again.");
        const data = await res.json();
        if (controller.signal.aborted) return;
        const pages = Math.max(1, data.pagination?.totalPages || 0);
        if (page > pages) { setPage(pages); return; }
        setActivities(data.data || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(pages);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "We couldn’t load activities.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [query, startDate, endDate, sort, page, limit, refresh]);

  async function deleteActivity(activity: ActivityItem) {
    if (pending) return;
    if (!window.confirm(`Delete “${activity.name}”? This permanently removes the activity.`)) return;
    setPending(activity._id);
    try {
      const res = await fetch(`/api/admin/activities/${activity._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Couldn’t delete this activity.");
      }
      toast.success("Activity deleted successfully");
      setRefresh(value => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t delete this activity.");
    } finally { setPending(null); }
  }

  function clearFilters() { setSearch(""); setQuery(""); setStartDate(""); setEndDate(""); setPage(1); }
  const filtered = Boolean(search || startDate || endDate);
  const busy = loading || search !== query;
  const first = total ? (page - 1) * limit + 1 : 0;
  const pages = Array.from(new Set([1, page - 1, page, page + 1, totalPages])).filter(value => value >= 1 && value <= totalPages).sort((a, b) => a - b);

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <div><p className={styles.eyebrow}>Library management</p><h1>Activities</h1><p className={styles.subtitle}>Browse, preview, and manage your library content.</p></div>
        <Link href="/admin/activities/create" className={styles.addButton}><Plus size={18} aria-hidden="true" />Add activity</Link>
      </div>
      <section className={styles.card} aria-label="Activity management">
        <div className={styles.cardHeading}><span className={styles.cardTitle}><Activity size={19} aria-hidden="true" />{filtered ? "Matching activities" : "All activities"}<span className={styles.count}>{busy || error ? "—" : total.toLocaleString()}</span></span></div>
        <div className={styles.filters}>
          <label className={styles.searchLabel} htmlFor="activity-search">Search activities<span className={styles.searchField}><Search size={18} aria-hidden="true" /><input id="activity-search" type="search" placeholder="Search activities" value={search} onChange={event => setSearch(event.target.value)} /></span></label>
          <label htmlFor="activity-sort">Sort by<select id="activity-sort" value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}><option value="createdAt|desc">Newest first</option><option value="createdAt|asc">Oldest first</option><option value="name|asc">Name A–Z</option><option value="name|desc">Name Z–A</option></select></label>
          <div className={styles.dateFilters}><label htmlFor="activity-start">Created from<input id="activity-start" type="date" value={startDate} max={endDate || undefined} onChange={event => { setStartDate(event.target.value); setPage(1); }} /></label><label htmlFor="activity-end">Created to<input id="activity-end" type="date" value={endDate} min={startDate || undefined} onChange={event => { setEndDate(event.target.value); setPage(1); }} /></label></div>
          {filtered && <button type="button" className={styles.clearButton} onClick={clearFilters}><X size={15} aria-hidden="true" />Clear filters</button>}
        </div>

        {error ? <div className={styles.empty} role="alert"><Activity size={32} aria-hidden="true" /><h2>Activities couldn’t load</h2><p>{error}</p><button className={styles.textButton} onClick={() => setRefresh(value => value + 1)}>Try again</button></div>
          : busy ? <div className={styles.empty} role="status">Loading activities…</div>
          : activities.length === 0 ? <div className={styles.empty}><Activity size={36} aria-hidden="true" /><h2>{filtered ? "No matching activities" : "Your library starts here"}</h2><p>{filtered ? "Try another search or date range." : "Add your first activity to start building your library."}</p>{filtered ? <button className={styles.textButton} onClick={clearFilters}>Clear filters</button> : <Link className={styles.addButton} href="/admin/activities/create"><Plus size={17} aria-hidden="true" />Add activity</Link>}</div>
          : <div className={styles.tableScroll} role="region" aria-label="Activities table" tabIndex={0}>
            <table className={styles.table}><thead><tr><th scope="col">Activity</th><th scope="col">Media</th><th scope="col">Schedule date</th><th scope="col">Status</th><th scope="col" className={styles.actionsHeading}>Actions</th></tr></thead><tbody>
              {activities.map(activity => <tr key={activity._id}>
                <td><div className={styles.identity}><span className={styles.activityIcon}><Activity size={20} aria-hidden="true" /></span><div><Link className={styles.name} href={`/admin/activities/${activity._id}/view`}>{activity.name || "Untitled activity"}</Link><span className={styles.userId} title={activity._id}>#{activity._id.slice(-6)}</span></div></div></td>
                <td>{(getActivityImage(activity) || activity.video) ? <Link className={styles.mediaLink} href={`/admin/activities/${activity._id}/view`}>{getActivityImage(activity) ? <ImageIcon size={16} aria-hidden="true" /> : <Video size={16} aria-hidden="true" />}Preview</Link> : <span className={styles.muted}>No media</span>}</td>
                <td className={styles.date}>{scheduleLabel(activity.scheduleDate)}</td>
                <td><span className={`${styles.badge} ${activity.status === 1 ? styles.active : styles.inactive}`}>{activity.status === 1 ? "Active" : "Inactive"}</span></td>
                <td><div className={styles.actions}><Link href={`/admin/activities/${activity._id}/view`} aria-label={`View ${activity.name}`} title="View activity"><Eye size={17} aria-hidden="true" /></Link><Link href={`/admin/activities/${activity._id}/edit`} aria-label={`Edit ${activity.name}`} title="Edit activity"><Pencil size={17} aria-hidden="true" /></Link><button type="button" className={styles.deleteButton} disabled={pending !== null} onClick={() => deleteActivity(activity)} aria-label={`Delete ${activity.name}`} title="Delete activity"><Trash2 size={17} aria-hidden="true" /></button></div></td>
              </tr>)}
            </tbody></table>
          </div>}

        <div className={styles.footer}><div className={styles.results}><label htmlFor="activity-limit">Rows per page<select id="activity-limit" value={limit} onChange={event => { setLimit(Number(event.target.value)); setPage(1); }}>{[10, 25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label><span aria-live="polite">{error ? "Results unavailable" : busy ? "Loading…" : `${first}–${Math.min(page * limit, total)} of ${total.toLocaleString()}`}</span></div>
          <nav className={styles.pagination} aria-label="Activity list pages"><button disabled={busy || Boolean(error) || page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))} aria-label="Previous page"><ChevronLeft size={17} aria-hidden="true" /></button>{pages.map((number, index) => <span className={styles.pageItem} key={number}>{index > 0 && number - pages[index - 1] > 1 && <span className={styles.ellipsis}>…</span>}<button disabled={busy || Boolean(error)} aria-label={`Page ${number}`} aria-current={page === number ? "page" : undefined} onClick={() => setPage(number)}>{number}</button></span>)}<button disabled={busy || Boolean(error) || page >= totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))} aria-label="Next page"><ChevronRight size={17} aria-hidden="true" /></button></nav>
        </div>
      </section>
    </div>
  );
}
