"use client";

import { useEffect, useState } from "react";
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

export default function GoogleSubscribersReport() {
  const [environment, setEnvironment] = useState<GooglePlayEnvironment>("production");
  const [report, setReport] = useState<GoogleSubscriberReport | null>(null);
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
  const rows = [
    ...(current?.subscribers ?? []).map(account => ({ kind: "confirmed" as const, account })),
    ...(current?.recordedPurchases ?? []).map(purchase => ({ kind: "recorded" as const, purchase })),
  ].filter(row => {
    if (row.kind === "recorded") {
      const purchase = row.purchase;
      return `${purchase.name ?? ""} ${purchase.email ?? ""} ${purchase.productId ?? ""} ${purchase.orderId ?? ""}`.toLowerCase().includes(query) &&
        (!status || status === "review");
    }
    const account = row.account;
    return `${account.name ?? ""} ${account.email ?? ""} ${account.subscriptions.map(s => `${s.productId} ${s.orderId}`).join(" ")}`.toLowerCase().includes(query) &&
      (!status || (status === "review" ? account.needsReview : account.subscriptions.some(s => s.state === status)));
  });
  const pages = Math.max(1, Math.ceil(rows.length / 25));
  const selectedPage = Math.min(page, pages);
  return <div className={shared.page}>
    <div className={shared.heading}>
      <div><p className={shared.eyebrow}>Google Play</p><h1>Subscribers</h1><p className={shared.subtitle}>Google-verified subscriptions and purchase records saved by the app.</p></div>
      <div className={styles.controls}>
        <label htmlFor="subscriber-environment">Environment<select id="subscriber-environment" value={environment} onChange={event => { setEnvironment(event.target.value as GooglePlayEnvironment); setSearch(""); setStatus(""); }}><option value="production">Production</option><option value="test">Test purchases</option></select></label>
        <button type="button" className={styles.reviewButton} disabled={loading} onClick={() => setRefresh(n => n + 1)}><RefreshCw size={16} aria-hidden="true" />Refresh</button>
      </div>
    </div>
    <div className={styles.notice}><Users size={20} aria-hidden="true" /><p>Totals count unique app accounts linked to saved subscriptions checked with Google, including regular plans, trials, and offers. Active includes grace periods and canceled subscriptions with time remaining. These are not Play Store-wide totals. Users dashboard totals use purchase-date estimates and may differ.</p></div>
    <div className={styles.metrics}>
      {[
        { label: "Confirmed subscribers", value: current?.totals.subscribers, detail: "Accounts with a Google-verified subscription" },
        { label: "Active subscribers", value: current?.totals.active, detail: "Includes canceled plans with paid time remaining" },
        { label: "Inactive subscribers", value: current?.totals.inactive, detail: "Inactive among available checked subscriptions" },
        { label: "Accounts needing review", value: current?.totals.needsReview, detail: "Unavailable checks or unknown subscription details" },
        { label: "Recorded purchases", value: current?.recordedPurchases?.length, detail: "Saved without a token; Google verification unavailable" },
      ].map(metric => <div key={metric.label} className={styles.metric}><div><span>{metric.label}</span></div><strong>{loading ? <OfferMetricSkeleton /> : metric.value ?? "—"}</strong><p>{metric.detail}</p></div>)}
    </div>
    {current && <div className={styles.notice} role="status"><p>{current.untrackedPurchases} saved Android purchase records have no token; {current.unavailablePurchases} token checks were unavailable; {current.unmatchedItems} subscription items could not be linked to one app account. These records are excluded from confirmed totals. Recorded purchases appear in this list in both environments because their environment could not be verified. Their current subscription status and discount are unknown. Restoring eligible purchases from the updated Android app may recover missing tokens. Counts cover available checks only.</p></div>}
    <section className={shared.card} aria-label="Google subscribers" aria-busy={loading}>
      <div className={styles.sectionHeading}><div><h2>Subscriber list</h2><p>Confirmed subscriptions and recorded purchases saved by the app. Verification is shown for each entry.</p></div></div>
      {error ? <div className={shared.empty} role="alert"><h2>Couldn’t load subscribers</h2><p>{error}</p><button type="button" className={shared.textButton} onClick={() => setRefresh(n => n + 1)}>Try again</button></div> : loading ? <OfferTableSkeleton columns={3} label="Checking subscribers with Google…" /> : <>
        <div className={`${shared.filters} ${styles.filters}`}>
          <label className={shared.searchLabel} htmlFor="subscriber-search">Search subscribers and recorded purchases<span className={shared.searchField}><Search size={18} aria-hidden="true" /><input id="subscriber-search" type="search" placeholder="Name, email, product, or transaction" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></span></label>
          <label htmlFor="subscriber-status">Subscription status<select id="subscriber-status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option>{Object.entries(stateLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}<option value="review">Needs review</option></select></label>
        </div>
        {rows.length ? <div className={shared.tableScroll} role="region" aria-label="Subscriber table" tabIndex={0}><table className={shared.table}>
          <thead><tr><th scope="col">Subscriber</th><th scope="col">Subscriptions</th><th scope="col">Verification</th></tr></thead>
          <tbody>{rows.slice((selectedPage - 1) * 25, selectedPage * 25).map(entry => {
            if (entry.kind === "recorded") {
              const row = entry.purchase;
              return <tr key={`recorded:${row.id}`}>
                <td><span className={shared.name}>{row.name || "Unnamed / deleted account"}</span><span className={shared.email}>{row.email || "Email unavailable"}</span></td>
                <td><span className={shared.name}>{row.productId || "Product unavailable"}</span><span className={shared.email}>Purchased {date(row.purchasedAt)} (UTC)</span><span className={shared.email}>Order: {row.orderId || "Unavailable"}</span></td>
                <td><span className={shared.name}>Recorded by app</span><span className={shared.email}>Not verified with Google · Subscription status unknown</span></td>
              </tr>;
            }
            const row = entry.account;
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
        </table></div> : <div className={shared.empty}><Users size={32} aria-hidden="true" /><h2>{search || status ? "No matching subscribers" : "No subscribers found in saved purchases"}</h2><p>{search || status ? "Try another search or status." : "A Google purchase or restore must reach the app server before it can appear here."}</p></div>}
        <div className={shared.footer}><span className={shared.results} role="status">{rows.length} entries · Page {selectedPage} of {pages}</span><div className={styles.controls}><button type="button" className={shared.textButton} disabled={selectedPage <= 1} onClick={() => setPage(selectedPage - 1)}>Previous</button><button type="button" className={shared.textButton} disabled={selectedPage >= pages} onClick={() => setPage(selectedPage + 1)}>Next</button></div></div>
      </>}
    </section>
    {current && <p className={styles.help}>{current.checkedPurchases} unique purchase tokens successfully checked across production and test · Updated {new Date(current.checkedAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC. Auto-renew off can still mean active until the paid period ends. Complimentary access and lifetime purchases are not Google Play subscriptions.</p>}
  </div>;
}
