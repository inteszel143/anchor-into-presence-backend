"use client";

import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, Clock3, RefreshCw, Search, Tag } from "lucide-react";
import type { OfferHistory, OfferTransaction, StoreEnvironment } from "@/lib/appStoreOffers";
import shared from "../users/users.module.css";
import styles from "./offers.module.css";

function displayDate(value: number | null) {
  return value === null ? "Unavailable" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(value);
}
function periodStatus(row: OfferTransaction, now: number) {
  if (row.revokedAt !== null) return "Revoked";
  if (row.expiresAt === null) return "Unknown";
  if (row.expiresAt <= now) return "Ended";
  return row.expiresAt - now <= 30 * 86400000 ? "Ending soon" : "In period";
}

export default function PromotionalOffersPage() {
  const [environment, setEnvironment] = useState<StoreEnvironment>("production");
  const [data, setData] = useState<OfferHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("soonest");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    async function load() {
      try {
        const response = await fetch(`/api/admin/offers?environment=${environment}`, { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || "Couldn’t load offer history.");
        if (!controller.signal.aborted) setData(body);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Couldn’t load offer history.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [environment, refresh]);

  // Do not show data from the previous environment while a new request starts.
  const current = data?.environment === environment && !loading && !error ? data : null;
  const transactions = current?.transactions ?? [];
  const now = current?.checkedAt ?? Date.now();
  const query = search.trim().toLowerCase();
  const filtered = Boolean(search || code || status);
  const rows = transactions.filter(row =>
    `${row.id} ${row.originalTransactionId} ${row.productId} ${row.code}`.toLowerCase().includes(query) &&
    (!code || row.code === code) && (!status || periodStatus(row, now) === status)
  ).sort((a, b) => {
    if (a.expiresAt === null) return b.expiresAt === null ? 0 : 1;
    if (b.expiresAt === null) return -1;
    return sort === "soonest" ? a.expiresAt - b.expiresAt : b.expiresAt - a.expiresAt;
  });
  const ending = transactions.filter(row => periodStatus(row, now) === "Ending soon").length;
  const active = transactions.filter(row => ["In period", "Ending soon"].includes(periodStatus(row, now))).length;
  const ended = transactions.filter(row => periodStatus(row, now) === "Ended").length;
  function clearFilters() { setSearch(""); setCode(""); setStatus(""); }

  return (
    <div className={shared.page}>
      <div className={shared.heading}>
        <div><p className={shared.eyebrow}>Subscriptions</p><h1>Promotional offers</h1><p className={shared.subtitle}>Offer transactions reported by Apple for your app.</p></div>
        <div className={styles.controls}>
          <label htmlFor="store-environment">App Store environment<select id="store-environment" value={environment} onChange={event => { setEnvironment(event.target.value as StoreEnvironment); clearFilters(); }}><option value="production">Production</option><option value="sandbox">Sandbox</option></select></label>
          <button type="button" className={styles.reviewButton} disabled={loading} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} aria-hidden="true" />{loading ? "Loading…" : "Refresh"}</button>
        </div>
      </div>
      <div className={styles.notice}><Tag size={19} aria-hidden="true" /><p>{current ? `Connected to Apple · ${environment === "production" ? "Production" : "Sandbox"} · ${displayDate(current.startDate)} – ${displayDate(current.endDate)} (UTC). ${current.notificationCount} notifications received.` : loading ? "Loading offer history from Apple…" : "App Store history is unavailable."} This report covers available notifications, not all historical redemptions. Renewals can produce multiple transactions for one offer.</p></div>
      <div className={styles.metrics}>
        {[
          { label: "Offer transactions", value: transactions.length, detail: "Unique transactions in this history", icon: Tag },
          { label: "Within reported period", value: active, detail: "Based on the reported period end", icon: CheckCircle2 },
          { label: "Period ends within 30 days", value: ending, detail: "Based on the latest loaded data", icon: CalendarClock },
          { label: "Reported period ended", value: ended, detail: "Excludes revoked transactions", icon: Clock3 },
        ].map(({ label, value, detail, icon: Icon }) => <div className={styles.metric} key={label}><div><span>{label}</span><Icon size={19} aria-hidden="true" /></div><strong>{current ? value : "—"}</strong><p>{detail}</p></div>)}
      </div>
      <section className={shared.card} aria-label="Offer transactions" aria-busy={loading}>
        <div className={styles.sectionHeading}><div><h2>Offer transactions</h2><p>Promotional offers and redeemed offer codes.</p></div><button type="button" className={styles.reviewButton} disabled={!current} onClick={() => { clearFilters(); setStatus("Ending soon"); setSort("soonest"); }}>View ending soon <span>{current ? ending : "—"}</span></button></div>
        {error ? <div className={shared.empty} role="alert"><h2>Couldn’t load offer history</h2><p>{error}</p><button type="button" className={shared.textButton} onClick={() => setRefresh(value => value + 1)}>Try again</button></div> : loading ? <div className={shared.empty} role="status"><p>Loading App Store transactions…</p></div> : <>
          <div className={`${shared.filters} ${styles.filters}`}>
            <label className={shared.searchLabel} htmlFor="offer-search">Search transactions<span className={shared.searchField}><Search size={18} aria-hidden="true" /><input id="offer-search" type="search" placeholder="Transaction, product, or offer ID" value={search} onChange={event => setSearch(event.target.value)} /></span></label>
            <label htmlFor="offer-code">Offer identifier<select id="offer-code" value={code} onChange={event => setCode(event.target.value)}><option value="">All offers</option>{[...new Set(transactions.map(row => row.code))].sort().map(value => <option key={value}>{value}</option>)}</select></label>
            <label htmlFor="offer-status">Reported period<select id="offer-status" value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{["In period", "Ending soon", "Ended", "Revoked", "Unknown"].map(value => <option key={value}>{value}</option>)}</select></label>
            <label htmlFor="offer-sort">Period end order<select id="offer-sort" value={sort} onChange={event => setSort(event.target.value)}><option value="soonest">Soonest first</option><option value="latest">Latest first</option></select></label>
            {filtered && <button type="button" className={shared.clearButton} onClick={clearFilters}>Clear filters</button>}
          </div>
          {rows.length ? <div className={shared.tableScroll} role="region" aria-label="Offer transaction table" tabIndex={0}>
            <table className={shared.table}>
              <thead><tr>{["Transaction", "Platform", "Offer", "Purchased on (UTC)", "Period ends (UTC)", "Reported period"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
              <tbody>{rows.map(row => {
                const state = periodStatus(row, now);
                return <tr key={`${row.platform}-${row.id}`}>
                  <td><span className={shared.name}>{row.id}</span><span className={shared.email}>Original: {row.originalTransactionId}</span></td>
                  <td><span className={`${styles.code} ${styles.ambassador}`}>{row.platform}</span></td>
                  <td><span className={`${styles.code} ${styles.vip}`}>{row.code}</span><span className={shared.email}>{row.kind} · {row.productId}</span></td>
                  <td className={shared.date}>{displayDate(row.purchasedAt)}</td>
                  <td className={shared.date}>{displayDate(row.expiresAt)}</td>
                  <td><span className={`${shared.badge} ${state === "In period" ? shared.active : state === "Ending soon" ? styles.ending : styles.expired}`}><span aria-hidden="true" />{state}</span></td>
                </tr>;
              })}</tbody>
            </table>
          </div> : <div className={shared.empty}><Tag size={32} aria-hidden="true" /><h2>{filtered ? "No matching transactions" : "No offer transactions reported"}</h2><p>{filtered ? "Try another transaction, offer identifier, or status." : "Apple returned no promotional-offer or offer-code transactions in this history window. Purchases can still exist without a notification here."}</p>{filtered && <button type="button" className={shared.textButton} onClick={clearFilters}>Clear filters</button>}</div>}
          <div className={shared.footer}><span className={shared.results} role="status">Showing {rows.length} of {transactions.length} offer transactions</span><span className={styles.footnote}>Period end is not the full promotion’s expiration date.</span></div>
        </>}
      </section>
      <p className={styles.help}>Apple does not include customer names or emails in this response. Notification records describe the transaction when reported and may not reflect current subscription access.</p>
    </div>
  );
}
