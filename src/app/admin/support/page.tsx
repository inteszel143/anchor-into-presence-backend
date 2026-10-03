"use client";

import { Check, ChevronLeft, ChevronRight, LifeBuoy, Search, X } from "lucide-react";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import styles from "./support.module.css";

type Support = { _id: string; title: string; description: string; status: number; userName?: string; createdAt: string };

function createdLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminSupportListPage() {
  const [tickets, setTickets] = useState<Support[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [sort, setSort] = useState("createdAt|desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

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
        const res = await fetch(`/api/admin/support?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error("We couldn’t load support tickets. Please try again.");
        const data = await res.json();
        if (!Array.isArray(data.support)) throw new Error("The server returned an invalid response. Please try again.");
        if (controller.signal.aborted) return;
        const pages = Math.max(1, data.totalPages || 0);
        if (page > pages) { setPage(pages); return; }
        setTickets(data.support);
        setTotal(data.total || 0);
        setTotalPages(pages);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "We couldn’t load support tickets.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [query, sort, startDate, endDate, page, limit, attempt]);

  function clearSearch() { setSearch(""); setQuery(""); setStartDate(""); setEndDate(""); setPage(1); }
  const filtered = Boolean(search || startDate || endDate);
  const busy = loading || search !== query;
  const first = total ? (page - 1) * limit + 1 : 0;
  const pages = Array.from(new Set([1, page - 1, page, page + 1, totalPages])).filter(value => value >= 1 && value <= totalPages).sort((a, b) => a - b);

  async function resolveTicket(ticket: Support) {
    if (pending) return;
    setPending(ticket._id);
    try {
      const response = await fetch(`/api/admin/support/${ticket._id}`, { method: "PATCH" });
      if (!response.ok) throw new Error("Couldn’t resolve this ticket. Please try again.");
      toast.success("Support ticket resolved");
      setTickets(previous => previous.map(item => item._id === ticket._id ? { ...item, status: 1 } : item));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn’t resolve this ticket.");
    } finally { setPending(null); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Help center</p>
        <h1>Support</h1>
        <p className={styles.subtitle}>Review user requests and keep track of resolved tickets.</p>
      </div>
      <section className={styles.card} aria-label="Support tickets">
        <div className={styles.cardHeading}><span className={styles.cardTitle}><LifeBuoy size={19} aria-hidden="true" />{filtered ? "Matching tickets" : "All tickets"}<span className={styles.count} aria-live="polite">{busy || error ? "—" : total.toLocaleString()}</span></span></div>
        <div className={styles.filters}>
          <label className={styles.searchLabel} htmlFor="support-search">Search tickets<span className={styles.searchField}><Search size={18} aria-hidden="true" /><input id="support-search" type="search" placeholder="Search by ticket title" value={search} onChange={event => setSearch(event.target.value)} /></span></label>
          <label htmlFor="support-sort">Sort by<select id="support-sort" value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}><option value="createdAt|desc">Newest first</option><option value="createdAt|asc">Oldest first</option><option value="title|asc">Title A–Z</option><option value="title|desc">Title Z–A</option></select></label>
          <div className={styles.dateFilters}>
            <label htmlFor="support-start">Created from<input id="support-start" type="date" value={startDate} max={endDate || undefined} onChange={event => { setStartDate(event.target.value); setPage(1); }} /></label>
            <label htmlFor="support-end">Created to<input id="support-end" type="date" value={endDate} min={startDate || undefined} onChange={event => { setEndDate(event.target.value); setPage(1); }} /></label>
          </div>
          {filtered && <button type="button" className={styles.clearButton} onClick={clearSearch}><X size={15} aria-hidden="true" />Clear filters</button>}
        </div>

        {error ? <div className={styles.empty} role="alert"><LifeBuoy size={32} aria-hidden="true" /><h2>Tickets couldn’t load</h2><p>{error}</p><button className={styles.textButton} onClick={() => setAttempt(value => value + 1)}>Try again</button></div>
          : busy ? <div className={styles.empty} role="status">Loading tickets…</div>
          : tickets.length === 0 ? <div className={styles.empty}><LifeBuoy size={36} aria-hidden="true" /><h2>{filtered ? "No matching tickets" : "No support tickets yet"}</h2><p>{filtered ? "Try another title or date range." : "Requests submitted by your users will appear here."}</p>{filtered && <button className={styles.textButton} onClick={clearSearch}>Clear filters</button>}</div>
          : <div className={styles.tableScroll} role="region" aria-label="Support tickets table" tabIndex={0}>
            <table className={styles.table}>
              <thead><tr><th scope="col">Ticket</th><th scope="col">Submitted by</th><th scope="col">Message</th><th scope="col">Created</th><th scope="col">Status</th><th scope="col" className={styles.actionsHeading}>Action</th></tr></thead>
              <tbody>{tickets.map(ticket => <tr key={ticket._id}>
                <td><div className={styles.identity}><span className={styles.ticketIcon}><LifeBuoy size={20} aria-hidden="true" /></span><div><span className={styles.name}>{ticket.title || "Untitled ticket"}</span><span className={styles.ticketId} title={ticket._id}>#{ticket._id.slice(-6)}</span></div></div></td>
                <td><span className={styles.requester}>{ticket.userName?.trim() || "Unknown user"}</span></td>
                <td><p className={styles.description}>{ticket.description?.trim() || "No details provided."}</p></td>
                <td className={styles.date}>{createdLabel(ticket.createdAt)}</td>
                <td><span className={`${styles.badge} ${ticket.status === 0 ? styles.open : styles.resolved}`}><span aria-hidden="true" />{ticket.status === 0 ? "Open" : "Resolved"}</span></td>
                <td><div className={styles.actions}>{ticket.status === 0 ? <button type="button" className={styles.resolveButton} disabled={pending !== null} onClick={() => resolveTicket(ticket)} aria-label={`Resolve ticket: ${ticket.title}`}><Check size={16} aria-hidden="true" />{pending === ticket._id ? "Resolving…" : "Resolve"}</button> : <span className={styles.completed}><Check size={16} aria-hidden="true" />Resolved</span>}</div></td>
              </tr>)}</tbody>
            </table>
          </div>}

        <div className={styles.footer}>
          <div className={styles.results}><label htmlFor="support-limit">Rows per page<select id="support-limit" value={limit} onChange={event => { setLimit(Number(event.target.value)); setPage(1); }}>{[10, 25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label><span aria-live="polite">{error ? "Results unavailable" : busy ? "Loading…" : `${first}–${Math.min(page * limit, total)} of ${total.toLocaleString()}`}</span></div>
          <nav className={styles.pagination} aria-label="Support ticket pages"><button disabled={busy || Boolean(error) || page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))} aria-label="Previous page"><ChevronLeft size={17} aria-hidden="true" /></button>{pages.map((number, index) => <span className={styles.pageItem} key={number}>{index > 0 && number - pages[index - 1] > 1 && <span className={styles.ellipsis}>…</span>}<button disabled={busy || Boolean(error)} aria-label={`Page ${number}`} aria-current={page === number ? "page" : undefined} onClick={() => setPage(number)}>{number}</button></span>)}<button disabled={busy || Boolean(error) || page >= totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))} aria-label="Next page"><ChevronRight size={17} aria-hidden="true" /></button></nav>
        </div>
      </section>
    </div>
  );
}
