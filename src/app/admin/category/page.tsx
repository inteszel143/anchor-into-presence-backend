"use client";

import { ChevronLeft, ChevronRight, Eye, FolderOpen, Pencil, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./categories.module.css";

type Category = { _id: string; name: string; description: string; status: number };

export default function AdminCategoryListPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
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
        const params = new URLSearchParams({ search: query, sortBy, sortOrder, page: String(page), limit: String(limit) });
        const res = await fetch(`/api/admin/category?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error("We couldn’t load categories. Please try again.");
        const data = await res.json();
        if (controller.signal.aborted) return;
        const pages = Math.max(1, data.pagination?.totalPages || 0);
        if (page > pages) { setPage(pages); return; }
        setCategories(data.data || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(pages);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "We couldn’t load categories.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [query, sort, page, limit, attempt]);

  function clearSearch() { setSearch(""); setQuery(""); setPage(1); }
  const busy = loading || search !== query;
  const first = total ? (page - 1) * limit + 1 : 0;
  const pages = Array.from(new Set([1, page - 1, page, page + 1, totalPages])).filter(value => value >= 1 && value <= totalPages).sort((a, b) => a - b);

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Library management</p>
        <h1>Categories</h1>
        <p className={styles.subtitle}>Review and organize the categories in your library.</p>
      </div>
      <section className={styles.card} aria-label="Category management">
        <div className={styles.cardHeading}><span className={styles.cardTitle}><FolderOpen size={19} aria-hidden="true" />{search ? "Matching categories" : "All categories"}<span className={styles.count} aria-live="polite">{busy || error ? "—" : total.toLocaleString()}</span></span></div>
        <div className={styles.filters}>
          <label className={styles.searchLabel} htmlFor="category-search">Search categories<span className={styles.searchField}><Search size={18} aria-hidden="true" /><input id="category-search" type="search" placeholder="Search by category name" value={search} onChange={event => setSearch(event.target.value)} /></span></label>
          <label htmlFor="category-sort">Sort by<select id="category-sort" value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}><option value="createdAt|desc">Newest first</option><option value="createdAt|asc">Oldest first</option><option value="name|asc">Name A–Z</option><option value="name|desc">Name Z–A</option></select></label>
          {search && <button type="button" className={styles.clearButton} onClick={clearSearch}><X size={15} aria-hidden="true" />Clear search</button>}
        </div>

        {error ? <div className={styles.empty} role="alert"><FolderOpen size={32} aria-hidden="true" /><h2>Categories couldn’t load</h2><p>{error}</p><button className={styles.textButton} onClick={() => setAttempt(value => value + 1)}>Try again</button></div>
          : busy ? <div className={styles.empty} role="status">Loading categories…</div>
          : categories.length === 0 ? <div className={styles.empty}><FolderOpen size={36} aria-hidden="true" /><h2>{search ? "No matching categories" : "No categories yet"}</h2><p>{search ? "Try another category name." : "Your library categories will appear here."}</p>{search && <button className={styles.textButton} onClick={clearSearch}>Clear search</button>}</div>
          : <div className={styles.tableScroll} role="region" aria-label="Categories table" tabIndex={0}>
            <table className={styles.table}>
              <thead><tr><th scope="col">Category</th><th scope="col">Description</th><th scope="col">Status</th><th scope="col" className={styles.actionsHeading}>Actions</th></tr></thead>
              <tbody>{categories.map(category => <tr key={category._id}>
                <td><div className={styles.identity}><span className={styles.categoryIcon}><FolderOpen size={20} aria-hidden="true" /></span><div><Link className={styles.name} href={`/admin/category/${category._id}/view`}>{category.name || "Untitled category"}</Link><span className={styles.categoryId} title={category._id}>#{category._id.slice(-6)}</span></div></div></td>
                <td><p className={styles.description}>{category.description?.trim() || "No description added."}</p></td>
                <td><span className={`${styles.badge} ${category.status === 0 ? styles.inactive : styles.active}`}><span aria-hidden="true" />{category.status === 0 ? "Inactive" : "Active"}</span></td>
                <td><div className={styles.actions}><Link href={`/admin/category/${category._id}/view`} aria-label={`View ${category.name}`} title="View category"><Eye size={17} aria-hidden="true" /></Link><Link href={`/admin/category/${category._id}/edit`} aria-label={`Edit ${category.name}`} title="Edit category"><Pencil size={17} aria-hidden="true" /></Link></div></td>
              </tr>)}</tbody>
            </table>
          </div>}

        <div className={styles.footer}>
          <div className={styles.results}><label htmlFor="category-limit">Rows per page<select id="category-limit" value={limit} onChange={event => { setLimit(Number(event.target.value)); setPage(1); }}>{[10, 25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label><span aria-live="polite">{error ? "Results unavailable" : busy ? "Loading…" : `${first}–${Math.min(page * limit, total)} of ${total.toLocaleString()}`}</span></div>
          <nav className={styles.pagination} aria-label="Category list pages"><button disabled={busy || Boolean(error) || page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))} aria-label="Previous page"><ChevronLeft size={17} aria-hidden="true" /></button>{pages.map((number, index) => <span className={styles.pageItem} key={number}>{index > 0 && number - pages[index - 1] > 1 && <span className={styles.ellipsis}>…</span>}<button disabled={busy || Boolean(error)} aria-label={`Page ${number}`} aria-current={page === number ? "page" : undefined} onClick={() => setPage(number)}>{number}</button></span>)}<button disabled={busy || Boolean(error) || page >= totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))} aria-label="Next page"><ChevronRight size={17} aria-hidden="true" /></button></nav>
        </div>
      </section>
    </div>
  );
}
