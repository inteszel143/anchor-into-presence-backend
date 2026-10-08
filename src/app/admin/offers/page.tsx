"use client";

import { useState } from "react";
import { CalendarClock, CheckCircle2, Clock3, FlaskConical, Search, Tag } from "lucide-react";
import { daysRemaining, displayDate, endingSoonCount, offerStatus, redemptions, snapshotDate } from "./mock-data";
import shared from "../users/users.module.css";
import styles from "./offers.module.css";

export default function PromotionalOffersPage() {
  const [search, setSearch] = useState("");
  const [code, setCode] = useState("All offers");
  const [status, setStatus] = useState("All statuses");
  const [sort, setSort] = useState("soonest");
  const query = search.trim().toLowerCase();
  const filtered = Boolean(search || code !== "All offers" || status !== "All statuses");
  const rows = redemptions.filter(row =>
    `${row.name} ${row.email} ${row.code}`.toLowerCase().includes(query) &&
    (code === "All offers" || row.code === code) &&
    (status === "All statuses" || offerStatus(row.expires) === status)
  ).sort((a, b) => sort === "soonest" ? a.expires.localeCompare(b.expires) : b.expires.localeCompare(a.expires));
  const ending = endingSoonCount;
  const active = redemptions.filter(row => daysRemaining(row.expires) >= 0).length;

  function clearFilters() { setSearch(""); setCode("All offers"); setStatus("All statuses"); }

  return (
    <div className={shared.page}>
      <div className={shared.heading}>
        <div><p className={shared.eyebrow}>Subscriptions</p><h1>Promotional offers</h1><p className={shared.subtitle}>See who redeemed an offer and when their promotional access ends.</p></div>
        <span className={styles.preview}><FlaskConical size={16} aria-hidden="true" />Mock data preview</span>
      </div>

      <div className={styles.notice}><FlaskConical size={19} aria-hidden="true" /><p>Sample users and redemptions, as of <strong>{displayDate(snapshotDate)}</strong>. Live App Store data is not connected.</p></div>

      <div className={styles.metrics}>
        {[
          { label: "Total redemptions", value: redemptions.length, detail: "Across both promotional offers", icon: Tag },
          { label: "Active offers", value: active, detail: "Includes offers ending soon", icon: CheckCircle2 },
          { label: "Ending within 30 days", value: ending, detail: "Review for a possible follow-up offer", icon: CalendarClock },
          { label: "Expired offers", value: redemptions.length - active, detail: "Promotional period has ended", icon: Clock3 },
        ].map(({ label, value, detail, icon: Icon }) => <div className={styles.metric} key={label}><div><span>{label}</span><Icon size={19} aria-hidden="true" /></div><strong>{value}</strong><p>{detail}</p></div>)}
      </div>

      <section className={shared.card} aria-label="Offer redemptions">
        <div className={styles.sectionHeading}><div><h2>Offer redemptions</h2><p>Plan ahead for your VIPs and ambassadors.</p></div><button type="button" className={styles.reviewButton} onClick={() => { setSearch(""); setCode("All offers"); setStatus("Ending soon"); setSort("soonest"); }}>View ending soon <span>{ending}</span></button></div>
        <div className={`${shared.filters} ${styles.filters}`}>
          <label className={shared.searchLabel} htmlFor="offer-search">Search redemptions<span className={shared.searchField}><Search size={18} aria-hidden="true" /><input id="offer-search" type="search" placeholder="Name, email, or offer code" value={search} onChange={event => setSearch(event.target.value)} /></span></label>
          <label htmlFor="offer-code">Offer code<select id="offer-code" value={code} onChange={event => setCode(event.target.value)}>{["All offers", "ANCHORVIP", "ANCHORAMBASSADOR"].map(value => <option key={value}>{value}</option>)}</select></label>
          <label htmlFor="offer-status">Offer status<select id="offer-status" value={status} onChange={event => setStatus(event.target.value)}>{["All statuses", "Active", "Ending soon", "Expired"].map(value => <option key={value}>{value}</option>)}</select></label>
          <label htmlFor="offer-sort">Expiration order<select id="offer-sort" value={sort} onChange={event => setSort(event.target.value)}><option value="soonest">Soonest first</option><option value="latest">Latest first</option></select></label>
          {filtered && <button type="button" className={shared.clearButton} onClick={clearFilters}>Clear filters</button>}
        </div>

        {rows.length ? <div className={shared.tableScroll} role="region" aria-label="Offer redemption table" tabIndex={0}>
          <table className={shared.table}>
            <thead><tr>{["User", "Redeemed offer", "Redeemed on", "Offer expires", "Time remaining", "Offer status"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
            <tbody>{rows.map(row => {
              const remaining = daysRemaining(row.expires);
              const state = offerStatus(row.expires);
              return <tr key={row.id}>
                <td><div className={shared.identity}><span className={shared.avatar} aria-hidden="true">{row.name.split(" ").map(part => part[0]).join("")}</span><div><span className={shared.name}>{row.name}</span><span className={shared.email}>{row.email}</span></div></div></td>
                <td><span className={`${styles.code} ${row.code === "ANCHORVIP" ? styles.vip : styles.ambassador}`}>{row.code}</span><span className={shared.email}>{row.plan} subscription</span></td>
                <td className={shared.date}>{displayDate(row.redeemed)}</td>
                <td className={shared.date}><strong>{displayDate(row.expires)}</strong></td>
                <td className={styles.remaining}>{remaining < 0 ? `Ended ${Math.abs(remaining)} days ago` : remaining === 0 ? "Ends today" : `${remaining} days left`}</td>
                <td><span className={`${shared.badge} ${state === "Active" ? shared.active : state === "Expired" ? styles.expired : styles.ending}`}><span aria-hidden="true" />{state}</span></td>
              </tr>;
            })}</tbody>
          </table>
        </div> : <div className={shared.empty}><Tag size={32} aria-hidden="true" /><h2>No matching redemptions</h2><p>Try another name, offer code, or status.</p><button type="button" className={shared.textButton} onClick={clearFilters}>Clear filters</button></div>}
        <div className={shared.footer}><span className={shared.results} role="status">Showing {rows.length} of {redemptions.length} sample redemptions</span><span className={styles.footnote}>Offer expiration is separate from subscription renewal.</span></div>
      </section>
      <p className={styles.help}>Use “Ending soon” to review who may benefit from another offer. This preview does not extend offers or change subscriptions.</p>
    </div>
  );
}
