"use client";

import { ChevronLeft, ChevronRight, Search, Trash2, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import styles from "./users.module.css";

type User = {
  _id: string;
  name: string;
  email: string;
  isBlocked: boolean;
  createdAt: string;
};

function joinedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminUserListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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
    async function loadUsers() {
      try {
        const params = new URLSearchParams({ search: query, startDate, endDate, page: String(page), limit: String(limit) });
        const res = await fetch(`/api/admin/users?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error("We couldn’t load users. Please try again.");
        const data = await res.json();
        if (controller.signal.aborted) return;
        const pages = Math.max(1, data.totalPages || 0);
        if (page > pages) { setPage(pages); return; }
        setUsers(data.users || []);
        setTotal(data.total || 0);
        setTotalPages(pages);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "We couldn’t load users.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadUsers();
    return () => controller.abort();
  }, [query, startDate, endDate, page, limit, refresh]);

  async function deleteUser(user: User) {
    if (pending) return;
    if (!window.confirm(`Delete ${user.name || user.email}? This permanently removes the account.`)) return;
    setPending(user._id);
    try {
      const res = await fetch(`/api/admin/users/${user._id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Couldn’t update this user.");
      }
      toast.success("User deleted successfully");
      setRefresh(value => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t update this user.");
    } finally { setPending(null); }
  }

  function clearFilters() {
    setSearch(""); setQuery(""); setStartDate(""); setEndDate(""); setPage(1);
  }

  const filtered = Boolean(search || startDate || endDate);
  const busy = loading || search !== query;
  const first = total ? (page - 1) * limit + 1 : 0;
  const last = Math.min(page * limit, total);
  const pageNumbers = Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
    .filter(value => value >= 1 && value <= totalPages).sort((a, b) => a - b);

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <div><p className={styles.eyebrow}>People</p><h1>Users</h1><p className={styles.subtitle}>View registered users and manage account access.</p></div>
        <div className={styles.count} aria-live="polite"><Users size={20} aria-hidden="true" /><div><strong>{busy || error ? "—" : total.toLocaleString()}</strong><span>{filtered ? "Matching users" : "Registered users"}</span></div></div>
      </div>

      <section className={styles.card} aria-label="User management">
        <div className={styles.filters}>
          <label className={styles.searchLabel} htmlFor="user-search">Search users
            <span className={styles.searchField}><Search size={18} aria-hidden="true" /><input id="user-search" type="search" placeholder="Search by name or email" value={search} onChange={event => setSearch(event.target.value)} /></span>
          </label>
          <div className={styles.dateFilters}>
            <label htmlFor="user-start-date">Joined from<input id="user-start-date" type="date" value={startDate} max={endDate || undefined} onChange={event => { setStartDate(event.target.value); setPage(1); }} /></label>
            <label htmlFor="user-end-date">Joined to<input id="user-end-date" type="date" value={endDate} min={startDate || undefined} onChange={event => { setEndDate(event.target.value); setPage(1); }} /></label>
          </div>
          {filtered && <button className={styles.clearButton} type="button" onClick={clearFilters}><X size={15} aria-hidden="true" />Clear filters</button>}
        </div>

        {error ? <div className={styles.empty} role="alert"><Users size={32} aria-hidden="true" /><h2>Users couldn’t load</h2><p>{error}</p><button className={styles.textButton} onClick={() => setRefresh(value => value + 1)}>Try again</button></div>
          : busy ? <div className={styles.empty} role="status"><span className={styles.loadingDot} />Loading users…</div>
          : users.length === 0 ? <div className={styles.empty}><Users size={36} aria-hidden="true" /><h2>{filtered ? "No matching users" : "No users yet"}</h2><p>{filtered ? "Try another name, email, or date range." : "Registered accounts will appear here."}</p>{filtered && <button className={styles.textButton} onClick={clearFilters}>Clear filters</button>}</div>
          : <div className={styles.tableScroll} role="region" aria-label="Users table" tabIndex={0}>
            <table className={styles.table}>
              <thead><tr><th scope="col">User</th><th scope="col">User ID</th><th scope="col">Joined</th><th scope="col">Status</th><th scope="col" className={styles.actionsHeading}>Actions</th></tr></thead>
              <tbody>{users.map(user => {
                const name = user.name?.trim() || "Unnamed user";
                const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
                return <tr key={user._id}>
                  <td><div className={styles.identity}><span className={styles.avatar} aria-hidden="true">{initials}</span><div><span className={styles.name}>{name}</span><span className={styles.email}>{user.email || "No email address"}</span></div></div></td>
                  <td><span className={styles.userId} title={user._id}>#{user._id.slice(-6)}</span></td>
                  <td className={styles.date}>{joinedDate(user.createdAt)}</td>
                  <td><span className={`${styles.badge} ${user.isBlocked ? styles.blocked : styles.active}`}><span aria-hidden="true" />{user.isBlocked ? "Blocked" : "Active"}</span></td>
                  <td><div className={styles.actions}>
                    <button type="button" className={styles.deleteButton} disabled={pending !== null} onClick={() => deleteUser(user)} aria-label={`Delete ${name}`} title="Delete user"><Trash2 size={17} aria-hidden="true" /></button>
                  </div></td>
                </tr>;
              })}</tbody>
            </table>
          </div>}

        <div className={styles.footer}>
          <div className={styles.results}><label htmlFor="users-per-page">Rows per page<select id="users-per-page" value={limit} onChange={event => { setLimit(Number(event.target.value)); setPage(1); }}>{[10, 25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label><span aria-live="polite">{error ? "Results unavailable" : busy ? "Loading…" : `${first}–${last} of ${total.toLocaleString()}`}</span></div>
          <nav className={styles.pagination} aria-label="User list pages">
            <button type="button" disabled={busy || Boolean(error) || page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))} aria-label="Previous page"><ChevronLeft size={17} aria-hidden="true" /></button>
            {pageNumbers.map((number, index) => <span key={number} className={styles.pageItem}>{index > 0 && number - pageNumbers[index - 1] > 1 && <span className={styles.ellipsis}>…</span>}<button type="button" aria-label={`Page ${number}`} aria-current={page === number ? "page" : undefined} disabled={busy || Boolean(error)} onClick={() => setPage(number)}>{number}</button></span>)}
            <button type="button" disabled={busy || Boolean(error) || page >= totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))} aria-label="Next page"><ChevronRight size={17} aria-hidden="true" /></button>
          </nav>
        </div>
      </section>
    </div>
  );
}
