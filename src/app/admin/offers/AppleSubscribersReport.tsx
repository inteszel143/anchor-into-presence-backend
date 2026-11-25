"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Search, Users } from "lucide-react";
import type { StoreEnvironment } from "@/lib/appStoreOffers";
import { anchorOfferSubscribers } from "@/lib/appleOfferCodes";
import { appleReviewLabels } from "@/lib/appleSubscriberTypes";
import type { AppleSubscriberReport } from "@/lib/appleSubscriberTypes";
import { OfferMetricSkeleton, OfferTableSkeleton } from "./OfferSkeleton";
import shared from "../users/users.module.css";
import styles from "./offers.module.css";

function date(value: number | null) {
  return value === null ? "Unavailable" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(value);
}

export default function AppleSubscribersReport({ offersOnly = false, environment: selectedEnvironment, refreshKey = 0 }: {
  offersOnly?: boolean;
  environment?: StoreEnvironment;
  refreshKey?: number;
} = {}) {
  const [localEnvironment, setEnvironment] = useState<StoreEnvironment>("production");
  const environment = selectedEnvironment ?? localEnvironment;
  const [report, setReport] = useState<AppleSubscriberReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setReport(null); setPage(1);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/subscribers?environment=${environment}`, { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || "Couldn’t load subscribers.");
        if (!controller.signal.aborted) setReport(body);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Couldn’t load subscribers.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [environment, refresh, refreshKey]);
  const current = !loading && !error && report?.environment === environment ? report : null;
  const query = search.trim().toLowerCase();
  // Use Apple's subscription snapshot independently of notification history.
  // Filter subscriptions as well as accounts so regular plans do not appear here.
  const subscribers = offersOnly ? anchorOfferSubscribers(current?.subscribers ?? []) : current?.subscribers ?? [];
  const rows = subscribers.filter(row =>
    `${row.name ?? ""} ${row.email ?? ""} ${row.subscriptions.map(s => `${s.productId} ${s.originalTransactionId} ${s.offerIdentifier ?? ""}`).join(" ")}`.toLowerCase().includes(query) &&
    (!status || (status === "review" ? row.conflict || row.unavailablePurchases > 0 : row.subscriptions.some(s => s.status === status)))
  );
  const reviewAccounts = subscribers.filter(row => row.conflict || row.unavailablePurchases > 0);
  const reviewBreakdown = [
    { label: "Subscription linked to multiple accounts", count: reviewAccounts.filter(row => row.conflict).length },
    ...Object.entries(appleReviewLabels).map(([reason, detail]) => ({ label: detail.label,
      count: reviewAccounts.filter(row => row.reviewReasons?.some(value => value === reason)).length })),
    { label: "Check incomplete; detailed reason unavailable", count: reviewAccounts.filter(row => row.unavailablePurchases > 0 && !row.reviewReasons?.length).length },
  ].filter(item => item.count > 0);
  const pages = Math.max(1, Math.ceil(rows.length / 25));
  const selectedPage = Math.min(page, pages);
  const reportControls = <div className={styles.controls}>
        <label htmlFor="subscriber-environment">Environment<select id="subscriber-environment" value={environment} onChange={event => { setEnvironment(event.target.value as StoreEnvironment); setSearch(""); setStatus(""); }}><option value="production">Production</option><option value="sandbox">Sandbox</option></select></label>
        <button type="button" className={styles.reviewButton} disabled={loading} onClick={() => setRefresh(n => n + 1)}><RefreshCw size={16} aria-hidden="true" />Refresh</button>
      </div>;
  return <div className={`${shared.page} ${offersOnly ? styles.embeddedSubscribers : ""}`}>
    {!offersOnly && <><div className={shared.heading}>
      <div><p className={shared.eyebrow}>Apple App Store</p><h1>Subscribers</h1><p className={shared.subtitle}>Regular subscriptions, trials, and offers, checked directly with Apple.</p></div>
      {reportControls}
    </div>
    <div className={styles.notice}><Users size={20} aria-hidden="true" /><p>Totals count unique app accounts with Apple-confirmed subscriptions, including expired subscriptions. Active includes billing grace periods. Coverage is limited to purchases saved by the app; this is not an App Store-wide total. Names and emails come from app accounts.</p></div>
    <div className={styles.metrics}>
      {[
        { label: "Verified subscribers", value: current?.totals.subscribers, detail: "Confirmed accounts, active or inactive" },
        { label: "Verified active subscribers", value: current?.totals.active, detail: "Active or in billing grace period" },
        { label: "Verified inactive subscribers", value: current?.totals.inactive, detail: "No active subscription; all checks complete" },
        { label: "Accounts with verification issues", value: current?.totals.needsReview, detail: "Incomplete checks or conflicting links—not necessarily inactive" },
      ].map(metric => <div key={metric.label} className={styles.metric}><div><span>{metric.label}</span></div><strong>{loading ? <OfferMetricSkeleton /> : metric.value ?? "—"}</strong><p>{metric.detail}</p></div>)}
    </div>
    </>}
    {!offersOnly && current && reviewAccounts.length > 0 && <section className={shared.card} aria-label="Apple verification issues">
      <div className={styles.sectionHeading}><div><h2>{reviewAccounts.length} accounts with verification issues</h2><p>These accounts have incomplete Apple checks or conflicting account links. This does not mean they are inactive or that a payment failed. An account may also have a verified subscription, so do not add this count to subscriber totals. App access is unchanged.</p></div>
        <button type="button" className={styles.reviewButton} onClick={() => { setStatus("review"); setSearch(""); setPage(1); }}>Show affected accounts</button>
      </div>
      <ul>{reviewBreakdown.map(item => <li key={item.label}>{item.label}: {item.count} accounts</li>)}</ul>
      <p className={styles.help}>An account can have more than one issue. The list below shows the reason and next step for each affected account.</p>
    </section>}
    <section className={shared.card} aria-label={offersOnly ? "Apple offer subscribers" : "Apple subscribers"} aria-busy={loading}>
      <div className={styles.sectionHeading}><div><h2>{offersOnly ? "Subscribers with promotional offers" : "Subscriber list"}</h2><p>{offersOnly ? "Only ANCHORVIP and ANCHORAMBASSADOR offer-code subscriptions confirmed by Apple. One row per app account." : "One row per app account. Renewals do not increase subscriber totals."}</p></div>{offersOnly && reportControls}</div>
      {error ? <div className={shared.empty} role="alert"><h2>Couldn’t load subscribers</h2><p>{error}</p><button type="button" className={shared.textButton} onClick={() => setRefresh(n => n + 1)}>Try again</button></div> : loading ? <OfferTableSkeleton columns={3} label="Checking subscribers with Apple…" /> : <>
        <div className={`${shared.filters} ${styles.filters}`}>
          <label className={shared.searchLabel} htmlFor="subscriber-search">Search subscribers<span className={shared.searchField}><Search size={18} aria-hidden="true" /><input id="subscriber-search" type="search" placeholder="Name, email, product, or transaction" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></span></label>
          <label htmlFor="subscriber-status">Subscription status<select id="subscriber-status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option>{["Active", "Grace period", "Expired", "Billing retry", "Revoked"].map(value => <option key={value}>{value}</option>)}<option value="review">Verification issues</option></select></label>
        </div>
        {rows.length ? <div className={shared.tableScroll} role="region" aria-label="Subscriber table" tabIndex={0}><table className={shared.table}>
          <thead><tr><th scope="col">Subscriber</th><th scope="col">Subscriptions</th><th scope="col">Verification</th></tr></thead>
          <tbody>{rows.slice((selectedPage - 1) * 25, selectedPage * 25).map(row => <tr key={row.id}>
            <td><span className={shared.name}>{row.name || "Unnamed / deleted account"}</span><span className={shared.email}>{row.email || "Email unavailable"}</span></td>
            <td>{row.subscriptions.length ? row.subscriptions.map(sub => <div key={sub.originalTransactionId} className={styles.subscriptionItem}>
              <span className={shared.name}>{sub.productId} · {sub.status}</span>
              <span className={shared.email}>{sub.offer}{sub.offerIdentifier ? ` · ${sub.offerIdentifier}` : ""} · Period ends {date(sub.expiresAt)} (UTC)</span>
              <span className={shared.email}>Auto-renew: {sub.autoRenewEnabled === null ? "Unavailable" : sub.autoRenewEnabled ? "On" : "Off"} · Original ID: {sub.originalTransactionId}</span>
            </div>) : "Subscription status unknown — no subscription confirmed"}</td>
            <td>
              {row.conflict && <div className={styles.subscriptionItem}><span className={shared.name}>Subscription linked to multiple accounts</span><span className={shared.email}>Ask technical support to confirm the correct account association. Excluded from verified totals until resolved.</span></div>}
              {row.reviewReasons?.map(reason => <div key={reason} className={styles.subscriptionItem}><span className={shared.name}>{appleReviewLabels[reason]?.label ?? "Verification incomplete"}</span><span className={shared.email}>{appleReviewLabels[reason]?.action ?? "Refresh or ask technical support to investigate."}</span></div>)}
              {row.unavailablePurchases > 0 && !row.reviewReasons?.length && <div><span className={shared.name}>Verification incomplete</span><span className={shared.email}>Refresh to retrieve the reason. This does not confirm an inactive subscription.</span></div>}
              {!row.conflict && !row.unavailablePurchases && "Checked with Apple"}
            </td>
          </tr>)}</tbody>
        </table></div> : <div className={shared.empty}><Users size={32} aria-hidden="true" /><h2>{search || status ? "No matching subscribers" : (offersOnly ? "No promotional subscriptions found" : "No subscribers found in saved purchases")}</h2><p>{search || status ? "Try another search or status." : (offersOnly ? "No saved purchases currently report an Apple-confirmed ANCHORVIP or ANCHORAMBASSADOR offer code. Regular yearly subscriptions are excluded." : "An Apple purchase or restore must reach the app server before it can appear here.")}</p></div>}
        <div className={shared.footer}><span className={shared.results} role="status">{rows.length} accounts · Page {selectedPage} of {pages}</span><div className={styles.controls}><button type="button" className={shared.textButton} disabled={selectedPage <= 1} onClick={() => setPage(selectedPage - 1)}>Previous</button><button type="button" className={shared.textButton} disabled={selectedPage >= pages} onClick={() => setPage(selectedPage + 1)}>Next</button></div></div>
      </>}
    </section>
    {!offersOnly && current && <p className={styles.help}>{current.checkedPurchases} unique purchase IDs successfully checked · Updated {new Date(current.checkedAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC. Auto-renew off can still mean active until the paid period ends. Complimentary access and lifetime purchases are not auto-renewable Apple subscriptions.</p>}
  </div>;
}
