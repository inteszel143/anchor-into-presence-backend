"use client";

import { useEffect, useState } from "react";
import { subscriptionPlan } from "@/lib/subscriptionPlan";
import { RefreshCw, Search, Users } from "lucide-react";
import type { GooglePlayEnvironment, GoogleSubscriberReport } from "@/lib/googlePlayOfferTypes";

import { OfferMetricSkeleton, OfferTableSkeleton } from "./OfferSkeleton";
import shared from "../users/users.module.css";
import styles from "./offers.module.css";

const stateLabels: Record<string, string> = {
  SUBSCRIPTION_STATE_ACTIVE: "Active", SUBSCRIPTION_STATE_IN_GRACE_PERIOD: "Grace period",
  SUBSCRIPTION_STATE_CANCELED: "Canceled", SUBSCRIPTION_STATE_EXPIRED: "Expired",
  SUBSCRIPTION_STATE_ON_HOLD: "On hold", SUBSCRIPTION_STATE_PAUSED: "Paused",
};

function date(value: number | null) {
  return value === null ? "Unavailable" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(value);
}

export default function GoogleSubscribersReport({ offersOnly = false }: { offersOnly?: boolean } = {}) {
  const [environment, setEnvironment] = useState<GooglePlayEnvironment>("production");
  const [report, setReport] = useState<GoogleSubscriberReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [unknownSearch, setUnknownSearch] = useState("");
  const [unknownPage, setUnknownPage] = useState(1);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setReport(null); setPage(1);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/subscribers/google?environment=${environment}`, { cache: "no-store", signal: controller.signal });
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
  }, [environment, refresh]);
  const current = !loading && !error && report?.environment === environment ? report : null;
  const query = search.trim().toLowerCase();
  const accounts = (current?.subscribers ?? []).map(account => offersOnly ? {
    ...account,
    subscriptions: account.subscriptions.filter(sub => sub.kind !== "Regular subscription"),
  } : account).filter(account => !offersOnly || account.subscriptions.length > 0);
  const rows = accounts.filter(account =>
    `${account.name ?? ""} ${account.email ?? ""} ${account.subscriptions.map(s => `${s.productId} ${s.orderId} ${s.offerId ?? ""} ${s.promotionCode ?? ""}`).join(" ")}`.toLowerCase().includes(query) &&
    (!status || (status === "review" ? account.needsReview : account.subscriptions.some(s => s.state === status)))
  );
  const unknownPurchases = current?.recordedPurchases ?? [];
  const unknownQuery = unknownSearch.trim().toLowerCase();
  const unknownRows = unknownPurchases.filter(row =>
    `${row.name ?? ""} ${row.email ?? ""} ${row.productId ?? ""} ${row.orderId ?? ""}`.toLowerCase().includes(unknownQuery));
  const unknownPages = Math.max(1, Math.ceil(unknownRows.length / 25));
  const selectedUnknownPage = Math.min(unknownPage, unknownPages);
  const pages = Math.max(1, Math.ceil(rows.length / 25));
  const selectedPage = Math.min(page, pages);
  const reportControls = <div className={styles.controls}>
        <label htmlFor="subscriber-environment">Environment<select id="subscriber-environment" value={environment} onChange={event => { setEnvironment(event.target.value as GooglePlayEnvironment); setSearch(""); setStatus(""); setUnknownSearch(""); setUnknownPage(1); }}><option value="production">Production</option><option value="test">Test purchases</option></select></label>
        <button type="button" className={styles.reviewButton} disabled={loading} onClick={() => setRefresh(n => n + 1)}><RefreshCw size={16} aria-hidden="true" />Refresh</button>
      </div>;
  return <div className={shared.page}>
    {!offersOnly && <div className={shared.heading}>
      <div><p className={shared.eyebrow}>Google Play</p><h1>{offersOnly ? "Promotional offers" : "Subscribers"}</h1><p className={shared.subtitle}>{offersOnly ? "Subscribers with offers checked directly with Google." : "Verified subscription status, with unverified purchases listed separately."}</p></div>
      {reportControls}
    </div>}
    {!offersOnly && <><div className={styles.notice}><Users size={20} aria-hidden="true" /><p>Totals count unique app accounts linked to saved subscriptions checked with Google, including regular plans, trials, and offers. Active includes grace periods and canceled subscriptions with time remaining. These are not Play Store-wide totals. Users dashboard totals use purchase-date estimates and may differ.</p></div>
    <div className={styles.metrics}>
      {[
        { label: "Verified subscribers", value: current?.totals.subscribers, detail: "Accounts with a Google-verified subscription" },
        { label: "Verified active subscribers", value: current?.totals.active, detail: "Includes canceled plans with paid time remaining" },
        { label: "Verified inactive subscribers", value: current?.totals.inactive, detail: "Inactive among available checked subscriptions" },
        { label: "Accounts needing review", value: current?.totals.needsReview, detail: "Unavailable checks or unknown subscription details" },
      ].map(metric => <div key={metric.label} className={styles.metric}><div><span>{metric.label}</span></div><strong>{loading ? <OfferMetricSkeleton /> : metric.value ?? "—"}</strong><p>{metric.detail}</p></div>)}
    </div>
    {current && current.totals.active === 0 && (unknownPurchases.length > 0 || current.totals.needsReview > 0 || current.unavailablePurchases > 0 || current.unmatchedItems > 0) &&
      <div className={styles.notice} role="status"><p>No active subscriptions have been verified. Some purchase statuses remain unknown. Unknown does not mean inactive.</p></div>}
    {current && <details className={styles.notice}><summary>Verification details</summary><p>{current.unavailablePurchases} Google checks were unavailable; {current.unmatchedItems} subscription items could not be linked to one app account. Subscriber totals cover available checks only and may be incomplete. These verification results do not change a customer’s app access.</p></details>}
    </>}
    <section className={shared.card} aria-label={offersOnly ? "Google offer subscribers" : "Google subscribers"} aria-busy={loading}>
      <div className={styles.sectionHeading}><div><h2>{offersOnly ? "Subscribers with promotional offers" : "Subscriber list"}</h2><p>{offersOnly ? "Subscription offers and promo codes checked with Google, grouped by app account. Coverage is limited to saved purchases matched to an account; an offer does not mean its discount is still running." : "One row per app account with a Google subscription check. Purchases with unknown status are listed separately below."}</p></div>{offersOnly && reportControls}</div>
      {error ? <div className={shared.empty} role="alert"><h2>Couldn’t load subscribers</h2><p>{error}</p><button type="button" className={shared.textButton} onClick={() => setRefresh(n => n + 1)}>Try again</button></div> : loading ? <OfferTableSkeleton columns={3} label="Checking subscribers with Google…" /> : <>
        <div className={`${shared.filters} ${styles.filters}`}>
          <label className={shared.searchLabel} htmlFor="subscriber-search">Search subscribers<span className={shared.searchField}><Search size={18} aria-hidden="true" /><input id="subscriber-search" type="search" placeholder={offersOnly ? "Name, email, product, offer, or code" : "Name, email, product, or transaction"} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></span></label>
          <label htmlFor="subscriber-status">Subscription status<select id="subscriber-status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option>{Object.entries(stateLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}<option value="review">Needs review</option></select></label>
        </div>
        {rows.length ? <div className={shared.tableScroll} role="region" aria-label="Subscriber table" tabIndex={0}><table className={shared.table}>
          <thead><tr><th scope="col">Subscriber</th><th scope="col">Subscriptions</th><th scope="col">Verification</th></tr></thead>
          <tbody>{rows.slice((selectedPage - 1) * 25, selectedPage * 25).map(row => {
            return <tr key={`confirmed:${row.id}`}>
            <td><span className={shared.name}>{row.name || "Unnamed / deleted account"}</span><span className={shared.email}>{row.email || "Email unavailable"}</span></td>
            <td>{row.subscriptions.length ? row.subscriptions.map(sub => <div key={sub.id} className={styles.subscriptionItem}>
              <span className={shared.name}>{sub.productId} · {stateLabels[sub.state] ?? "Unknown"}</span>
              <span className={shared.email}>{sub.promotionCode || sub.offerId || sub.kind} · Period ends {date(sub.expiresAt)} (UTC)</span>
              <span className={shared.email}>Auto-renew: {sub.autoRenewEnabled === null ? "Unavailable" : sub.autoRenewEnabled ? "On" : "Off"} · Order: {sub.orderId ?? "Unavailable"}</span>
            </div>) : "No subscription confirmed"}</td>
            <td>{row.unavailablePurchases ? `${row.unavailablePurchases} purchase checks unavailable` : row.needsReview ? "Subscription needs review" : "Checked with Google; app account match"}</td>
          </tr>;
          })}</tbody>
        </table></div> : <div className={shared.empty}><Users size={32} aria-hidden="true" /><h2>{search || status ? "No matching subscribers" : (offersOnly ? "No promotional subscribers found" : "No subscribers found in saved purchases")}</h2><p>{search || status ? "Try another search or status." : (offersOnly ? "No saved purchases matched to app accounts report an offer or promo code in this environment. Unverified purchases remain in the Subscribers tab." : "A Google purchase or restore must reach the app server before it can appear here.")}</p></div>}
        <div className={shared.footer}><span className={shared.results} role="status">{rows.length} accounts · Page {selectedPage} of {pages}</span><div className={styles.controls}><button type="button" className={shared.textButton} disabled={selectedPage <= 1} onClick={() => setPage(selectedPage - 1)}>Previous</button><button type="button" className={shared.textButton} disabled={selectedPage >= pages} onClick={() => setPage(selectedPage + 1)}>Next</button></div></div>
      </>}
    </section>
    {!offersOnly && current && <section className={shared.card} aria-label="Purchases with unknown status">
      <div className={styles.sectionHeading}><div><h2>Purchases with unknown status · {unknownPurchases.length}</h2><p>These purchases were saved, but their current subscription status couldn’t be confirmed with Google. They are excluded from verified subscriber totals and are not necessarily inactive.</p></div></div>
      <div className={styles.notice}><p>Missing Google verification information. Ask the customer to use Restore Purchases in the updated Android app, then refresh this report. Eligible purchases may be recovered; this does not guarantee verification or change app access. These purchases appear in both environments because their production/test environment is unknown.</p></div>
      <details className={styles.notice}><summary>Purchase record details</summary><p>{unknownPurchases.length} purchases after removing duplicate saved records for the same account and order. {current.untrackedPurchases} raw saved Android purchase records are missing a purchase token, which Google requires for verification. These are purchase counts, not unique customer counts. Subscription status and discount eligibility remain unknown.</p></details>
      <div className={`${shared.filters} ${styles.filters}`}><label className={shared.searchLabel} htmlFor="unknown-purchase-search">Search purchases with unknown status<span className={shared.searchField}><Search size={18} aria-hidden="true" /><input id="unknown-purchase-search" type="search" placeholder="Name, email, product, or order" value={unknownSearch} onChange={event => { setUnknownSearch(event.target.value); setUnknownPage(1); }} /></span></label></div>
      {unknownRows.length ? <div className={shared.tableScroll} role="region" aria-label="Purchases with unknown status table" tabIndex={0}><table className={shared.table}>
        <thead><tr>{["Customer", "Recorded plan / product", "Recorded purchase date (UTC)", "Status and reason"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{unknownRows.slice((selectedUnknownPage - 1) * 25, selectedUnknownPage * 25).map(row => <tr key={row.id}>
          <td><span className={shared.name}>{row.name || "Unnamed / deleted account"}</span><span className={shared.email}>{row.email || "Email unavailable"}</span></td>
          <td><span className={shared.name}>{subscriptionPlan(row.productId ?? undefined) ?? "Plan unavailable"}</span><span className={shared.email}>{row.productId || "Product unavailable"}</span><span className={shared.email}>Order: {row.orderId || "Unavailable"}</span></td>
          <td>{date(row.purchasedAt)}</td>
          <td><span className={shared.name}>Subscription status unknown</span><span className={shared.email}>Not verified with Google · Missing Google verification information</span></td>
        </tr>)}</tbody>
      </table></div> : <div className={shared.empty}><h3>{unknownSearch ? "No matching purchases" : "No purchases with unknown status"}</h3><p>{unknownSearch ? "Try another name, email, product, or order." : "No saved purchases are missing Google verification information."}</p></div>}
      <div className={shared.footer}><span className={shared.results} role="status">{unknownRows.length} of {unknownPurchases.length} purchases · Page {selectedUnknownPage} of {unknownPages}</span><div className={styles.controls}><button type="button" className={shared.textButton} disabled={selectedUnknownPage <= 1} onClick={() => setUnknownPage(selectedUnknownPage - 1)}>Previous</button><button type="button" className={shared.textButton} disabled={selectedUnknownPage >= unknownPages} onClick={() => setUnknownPage(selectedUnknownPage + 1)}>Next</button></div></div>
    </section>}
    {!offersOnly && current && <p className={styles.help}>{current.checkedPurchases} unique purchase tokens successfully checked across production and test · Updated {new Date(current.checkedAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC. Auto-renew off can still mean active until the paid period ends. Complimentary access and lifetime purchases are not Google Play subscriptions.</p>}
  </div>;
}
