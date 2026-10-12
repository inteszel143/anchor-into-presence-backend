"use client";

import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, Clock3, RefreshCw, Search, Tag } from "lucide-react";
import type { GooglePlayEnvironment, GooglePlayOfferReport } from "@/lib/googlePlayOfferTypes";
import shared from "../users/users.module.css";
import styles from "./offers.module.css";
import { OfferMetricSkeleton, OfferNoticeSkeleton, OfferTableSkeleton } from "./OfferSkeleton";

const stateLabels: Record<string, string> = {
  SUBSCRIPTION_STATE_ACTIVE: "Active",
  SUBSCRIPTION_STATE_IN_GRACE_PERIOD: "Grace period",
  SUBSCRIPTION_STATE_CANCELED: "Canceled",
  SUBSCRIPTION_STATE_EXPIRED: "Expired",
  SUBSCRIPTION_STATE_PAUSED: "Paused",
  SUBSCRIPTION_STATE_ON_HOLD: "On hold",
};
function displayDate(value: number | null) {
  return value === null ? "Unavailable" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(value);
}

export default function GoogleOffersReport() {
  const [environment, setEnvironment] = useState<GooglePlayEnvironment>("production");
  const [data, setData] = useState<GooglePlayOfferReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState("");
  const [offer, setOffer] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("soonest");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    async function load() {
      try {
        const response = await fetch(`/api/admin/offers/google?environment=${environment}`, { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || "Couldn’t load Google Play purchases.");
        if (!controller.signal.aborted) setData(body);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Couldn’t load Google Play purchases.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [environment, refresh]);

  const current = data?.environment === environment && !loading && !error ? data : null;
  const offers = current?.offers ?? [];
  const now = current?.checkedAt ?? Date.now();
  const query = search.trim().toLowerCase();
  const filtered = Boolean(search || offer || status);
  const endingSoon = (expires: number | null) => expires !== null && expires > now && expires - now <= 30 * 86400000;
  const identifier = (row: (typeof offers)[number]) => row.promotionCode || row.offerId || row.kind;
  const rows = offers.filter(row =>
    `${row.orderId ?? ""} ${row.productId} ${row.basePlanId ?? ""} ${row.offerId ?? ""} ${row.promotionCode ?? ""} ${row.kind}`.toLowerCase().includes(query) &&
    (!offer || identifier(row) === offer) &&
    (!status || (status === "ending" ? endingSoon(row.expiresAt) : row.state === status))
  ).sort((a, b) => {
    if (a.expiresAt === null) return b.expiresAt === null ? 0 : 1;
    if (b.expiresAt === null) return -1;
    return sort === "soonest" ? a.expiresAt - b.expiresAt : b.expiresAt - a.expiresAt;
  });
  function clearFilters() { setSearch(""); setOffer(""); setStatus(""); }

  return <div className={shared.page}>
    <div className={shared.heading}>
      <div><p className={shared.eyebrow}>Subscriptions · Google Play</p><h1>Promotional offers</h1><p className={shared.subtitle}>Offers and promo codes reported for saved Google Play purchases.</p></div>
      <div className={styles.controls}>
        <label htmlFor="google-environment">Purchase environment<select id="google-environment" value={environment} onChange={event => { setEnvironment(event.target.value as GooglePlayEnvironment); clearFilters(); }}><option value="production">Production</option><option value="test">Test purchases</option></select></label>
        <button type="button" className={styles.reviewButton} disabled={loading} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} aria-hidden="true" />Refresh</button>
      </div>
    </div>
    {loading ? <OfferNoticeSkeleton /> : <div className={styles.notice}><Tag size={19} aria-hidden="true" /><p>{current ? `Checked ${displayDate(current.checkedAt)} (UTC). ${current.checkedPurchases} saved purchases checked across production and test.` : "Google Play reporting is unavailable."} This is a current subscription snapshot, not a complete redemption or renewal history. An offer on a subscription does not mean its discount is still running.</p></div>}
    {current && (current.untrackedPurchases > 0 || current.unavailablePurchases > 0) && <div className={styles.notice} role="status"><p>{current.untrackedPurchases} older Android purchase records have no saved purchase token. {current.unavailablePurchases} saved purchases could not be retrieved from Google (not found or expired). These records are excluded; totals cover available purchases only.</p></div>}
    <div className={styles.metrics}>
      {[
        { label: "Reported offer items", value: offers.length, detail: "Subscription items with an offer or code", icon: Tag },
        { label: "Active subscriptions", value: offers.filter(row => row.state === "SUBSCRIPTION_STATE_ACTIVE").length, detail: "Google’s current subscription state", icon: CheckCircle2 },
        { label: "Period ends within 30 days", value: offers.filter(row => endingSoon(row.expiresAt)).length, detail: "Subscriptions may renew afterward", icon: CalendarClock },
        { label: "Expired subscriptions", value: offers.filter(row => row.state === "SUBSCRIPTION_STATE_EXPIRED").length, detail: "Among the available offer purchases", icon: Clock3 },
      ].map(({ label, value, detail, icon: Icon }) => <div className={styles.metric} key={label}><div><span>{label}</span><Icon size={19} aria-hidden="true" /></div><strong>{loading ? <OfferMetricSkeleton /> : current ? value : "—"}</strong><p>{detail}</p></div>)}
    </div>
    <section className={shared.card} aria-label="Google Play offer purchases" aria-busy={loading}>
      <div className={styles.sectionHeading}><div><h2>Offer purchases</h2><p>{environment === "test" ? "Test" : "Production"} subscription offers and redeemed promo codes.</p></div><button type="button" className={styles.reviewButton} disabled={!current} onClick={() => { clearFilters(); setStatus("ending"); setSort("soonest"); }}>View ending soon</button></div>
      {error ? <div className={shared.empty} role="alert"><h2>Couldn’t load Google Play offers</h2><p>{error}</p><button type="button" className={shared.textButton} onClick={() => setRefresh(value => value + 1)}>Try again</button></div> : loading ? <OfferTableSkeleton columns={5} /> : <>
        <div className={`${shared.filters} ${styles.filters}`}>
          <label className={shared.searchLabel} htmlFor="google-search">Search purchases<span className={shared.searchField}><Search size={18} aria-hidden="true" /><input id="google-search" type="search" placeholder="Order, product, offer, or promo code" value={search} onChange={event => setSearch(event.target.value)} /></span></label>
          <label htmlFor="google-offer">Offer or code<select id="google-offer" value={offer} onChange={event => setOffer(event.target.value)}><option value="">All offers</option>{[...new Set(offers.map(identifier))].sort().map(value => <option key={value}>{value}</option>)}</select></label>
          <label htmlFor="google-status">Subscription status<select id="google-status" value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option><option value="ending">Period ends within 30 days</option>{Object.entries(stateLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label htmlFor="google-sort">Period end order<select id="google-sort" value={sort} onChange={event => setSort(event.target.value)}><option value="soonest">Soonest first</option><option value="latest">Latest first</option></select></label>
          {filtered && <button type="button" className={shared.clearButton} onClick={clearFilters}>Clear filters</button>}
        </div>
        {rows.length ? <div className={shared.tableScroll} role="region" aria-label="Google Play offer table" tabIndex={0}><table className={shared.table}>
          <thead><tr>{["Latest successful order", "Offer / code", "Subscription started (UTC)", "Period ends (UTC)", "Subscription status"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{rows.map(row => <tr key={row.id}>
            <td><span className={shared.name}>{row.orderId ?? "Unavailable"}</span><span className={shared.email}>{row.productId}<br />Base plan: {row.basePlanId ?? "Unavailable"}</span></td>
            <td><span className={`${styles.code} ${styles.vip}`}>{identifier(row)}</span><span className={shared.email}>{row.kind}{row.promotionCode && row.offerId ? ` · ${row.offerId}` : ""}</span></td>
            <td className={shared.date}>{displayDate(row.startedAt)}</td><td className={shared.date}>{displayDate(row.expiresAt)}</td>
            <td><span className={`${shared.badge} ${row.state === "SUBSCRIPTION_STATE_ACTIVE" ? shared.active : styles.expired}`}><span aria-hidden="true" />{stateLabels[row.state] ?? "Unknown"}</span></td>
          </tr>)}</tbody>
        </table></div> : <div className={shared.empty}><Tag size={32} aria-hidden="true" /><h2>{filtered ? "No matching purchases" : "No offer purchases available"}</h2><p>{filtered ? "Try another offer, order, or subscription status." : current?.checkedPurchases ? "Google returned no offer purchases for this environment among the saved purchases checked." : "No retrievable Google purchases are saved yet. Purchases or restorations from the updated Android app will supply the records needed for this report."}</p>{filtered && <button type="button" className={shared.textButton} onClick={clearFilters}>Clear filters</button>}</div>}
        <div className={shared.footer}><span className={shared.results} role="status">Showing {rows.length} of {offers.length} offer items</span><span className={styles.footnote}>Period end is not the promotion’s expiration date.</span></div>
      </>}
    </section>
    <p className={styles.help}>One-time promo code text is not returned by Google. Canceled subscriptions may retain access until their period ends. Refresh to retrieve the latest available subscription state.</p>
  </div>;
}
