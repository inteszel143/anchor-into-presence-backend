"use client";

import { ChevronLeft, ChevronRight, CircleHelp, Search, Trash2, X } from "lucide-react";
import AddFaqModal from "@/components/AddFaqModal";
import EditModal from "@/components/EditModal";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import styles from "./faq.module.css";

type Faq = { _id: string; question: string; answer: string };

export default function AdminFaqListPage() {
  const [faqs, setFAQs] = useState<Faq[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
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

        const params = new URLSearchParams({ search: query, startDate, endDate, page: String(page), limit: String(limit) });
        const res = await fetch(`/api/admin/faqs?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error("We couldn’t load FAQs. Please try again.");
        const data = await res.json().catch(() => { throw new Error("The server returned an invalid response. Please try again."); });
        if (!Array.isArray(data.data) || data.status === false) throw new Error("We couldn’t load FAQs. Please try again.");
        if (controller.signal.aborted) return;
        const pages = Math.max(1, data.pagination?.totalPages || 0);
        if (page > pages) { setPage(pages); return; }
        setFAQs(data.data || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(pages);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "We couldn’t load FAQs.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [query, startDate, endDate, page, limit, attempt]);

  function clearSearch() { setSearch(""); setQuery(""); setStartDate(""); setEndDate(""); setPage(1); }
  const filtered = Boolean(search || startDate || endDate);
  const busy = loading || search !== query;
  const first = total ? (page - 1) * limit + 1 : 0;
  const pages = Array.from(new Set([1, page - 1, page, page + 1, totalPages])).filter(value => value >= 1 && value <= totalPages).sort((a, b) => a - b);

  async function saveFaq(faq: { _id?: string; question: string; answer: string }): Promise<boolean> {
    try {
      const response = await fetch(faq._id ? `/api/admin/faqs/${faq._id}` : "/api/admin/faqs/create", {
        method: faq._id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: faq.question, answer: faq.answer }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || data.status === false) throw new Error(data?.message || "Couldn’t save this FAQ. Please try again.");
      toast.success(faq._id ? "FAQ updated successfully" : "FAQ added successfully");
      setAttempt(value => value + 1);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn’t save this FAQ.");
      return false;
    }
  }

  async function deleteFaq(faq: Faq) {
    if (deleting || !window.confirm(`Delete this FAQ: “${faq.question}”?`)) return;
    setDeleting(faq._id);
    try {
      const response = await fetch(`/api/admin/faqs/${faq._id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Couldn’t delete this FAQ. Please try again.");
      toast.success("FAQ deleted successfully");
      setAttempt(value => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn’t delete this FAQ.");
    } finally { setDeleting(null); }
  }


  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Help center</p>
        <h1>FAQs</h1>
        <p className={styles.subtitle}>Manage the questions and answers that help your users.</p>
        <div className={styles.addAction}><AddFaqModal onAdd={faq => saveFaq(faq)} /></div>
      </div>
      <section className={styles.card} aria-label="FAQ management">
        <div className={styles.cardHeading}><span className={styles.cardTitle}><CircleHelp size={19} aria-hidden="true" />{filtered ? "Matching FAQs" : "All FAQs"}<span className={styles.count} aria-live="polite">{busy || error ? "—" : total.toLocaleString()}</span></span></div>
        <div className={styles.filters}>
          <label className={styles.searchLabel} htmlFor="faq-search">Search FAQs<span className={styles.searchField}><Search size={18} aria-hidden="true" /><input id="faq-search" type="search" placeholder="Search questions or answers" value={search} onChange={event => setSearch(event.target.value)} /></span></label>
          <div className={styles.dateFilters}>
            <label htmlFor="faq-start">Created from<input id="faq-start" type="date" value={startDate} max={endDate || undefined} onChange={event => { setStartDate(event.target.value); setPage(1); }} /></label>
            <label htmlFor="faq-end">Created to<input id="faq-end" type="date" value={endDate} min={startDate || undefined} onChange={event => { setEndDate(event.target.value); setPage(1); }} /></label>
          </div>
          {filtered && <button type="button" className={styles.clearButton} onClick={clearSearch}><X size={15} aria-hidden="true" />Clear filters</button>}
        </div>

        {error ? <div className={styles.empty} role="alert"><CircleHelp size={32} aria-hidden="true" /><h2>FAQs couldn’t load</h2><p>{error}</p><button className={styles.textButton} onClick={() => setAttempt(value => value + 1)}>Try again</button></div>
          : busy ? <div className={styles.empty} role="status">Loading FAQs…</div>
          : faqs.length === 0 ? <div className={styles.empty}><CircleHelp size={36} aria-hidden="true" /><h2>{filtered ? "No matching FAQs" : "No FAQs yet"}</h2><p>{filtered ? "Try another question, answer, or date range." : "Add your first question using Add FAQ."}</p>{filtered && <button className={styles.textButton} onClick={clearSearch}>Clear filters</button>}</div>
          : <div className={styles.tableScroll} role="region" aria-label="FAQs table" tabIndex={0}>
            <table className={styles.table}>
              <thead><tr><th scope="col">Question</th><th scope="col">Answer</th><th scope="col" className={styles.actionsHeading}>Actions</th></tr></thead>
              <tbody>{faqs.map(faq => <tr key={faq._id}>
                <td><div className={styles.identity}><span className={styles.faqIcon}><CircleHelp size={20} aria-hidden="true" /></span><div><span className={styles.name}>{faq.question || "Untitled question"}</span><span className={styles.faqId}>#{faq._id.slice(-6)}</span></div></div></td>
                <td><p className={styles.description}>{faq.answer || "No answer added."}</p></td>
                <td><div className={styles.actions}><EditModal faq={faq} onSave={saveFaq} /><button type="button" className={styles.deleteButton} disabled={deleting !== null} onClick={() => deleteFaq(faq)} aria-label={`Delete FAQ: ${faq.question}`} title="Delete FAQ"><Trash2 size={17} aria-hidden="true" /></button></div></td>
              </tr>)}</tbody>
            </table>
          </div>}

        <div className={styles.footer}>
          <div className={styles.results}><label htmlFor="faq-limit">Rows per page<select id="faq-limit" value={limit} onChange={event => { setLimit(Number(event.target.value)); setPage(1); }}>{[10, 25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label><span aria-live="polite">{error ? "Results unavailable" : busy ? "Loading…" : `${first}–${Math.min(page * limit, total)} of ${total.toLocaleString()}`}</span></div>
          <nav className={styles.pagination} aria-label="FAQ list pages"><button disabled={busy || Boolean(error) || page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))} aria-label="Previous page"><ChevronLeft size={17} aria-hidden="true" /></button>{pages.map((number, index) => <span className={styles.pageItem} key={number}>{index > 0 && number - pages[index - 1] > 1 && <span className={styles.ellipsis}>…</span>}<button disabled={busy || Boolean(error)} aria-label={`Page ${number}`} aria-current={page === number ? "page" : undefined} onClick={() => setPage(number)}>{number}</button></span>)}<button disabled={busy || Boolean(error) || page >= totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))} aria-label="Next page"><ChevronRight size={17} aria-hidden="true" /></button></nav>
        </div>
      </section>
    </div>
  );
}
