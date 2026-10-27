"use client";

import { ChevronLeft, ChevronRight, Search, FlaskConical, Users, X, RefreshCw, Leaf, ShieldBan, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { getImageUrl } from "@/lib/getImageUrl";
import { toast } from "react-toastify";
import styles from "./users-wellness.module.css";
import type { AdminSubscription } from "@/lib/adminSubscriptionStatus";

const accountTypes = {
  registered: "Registered users (all accounts)",
  active: "Active subscriptions (estimated)",
  test: "Test accounts",
};
type AccountType = keyof typeof accountTypes;

type User = {
  _id: string;
  name: string;
  email: string;
  image?: string | null;
  isBlocked: boolean;
  isTestAccount?: boolean;
  subscription?: AdminSubscription;
  createdAt: string;
};

function UserAvatar({ image, initials }: { image?: string | null; initials: string }) {
  const src = getImageUrl(image?.trim());
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return <span className={styles.avatar} aria-hidden="true">
    {src && failedSrc !== src ? <Image src={src} alt="" width={42} height={42} className={styles.avatarImage} unoptimized onError={() => setFailedSrc(src)} /> : initials}
  </span>;
}

function joinedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminUserListPage() {
  const [summary, setSummary] = useState<{ totalAccounts: number; testAccounts: number; estimatedActiveSubscriptions: number } | null>(null);
  const [summaryError, setSummaryError] = useState("");
  const [summaryRefresh, setSummaryRefresh] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [accountType, setAccountType] = useState<AccountType>("registered");
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

  const [accountAction, setAccountAction] = useState<{ user: User; type: "block" | "unblock" | "delete" } | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [actionError, setActionError] = useState("");
  const actionDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!accountAction) return;
    const dialog = actionDialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow; };
  }, [accountAction]);

  function openAccountAction(user: User, type: "block" | "unblock" | "delete") {
    setConfirmation(""); setActionError(""); setAccountAction({ user, type });
  }

  async function saveAccountAction() {
    if (!accountAction || pending) return;
    const { user, type } = accountAction;
    setPending(user._id);
    setActionError("");
    try {
      const response = await fetch(`/api/admin/users/${user._id}`, {
        method: type === "delete" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(type === "delete" ? { confirmation } : { isBlocked: type === "block" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update this account.");
      if (type !== "delete" && data.isBlocked !== (type === "block")) throw new Error("Account access was not saved. Please try again.");
      setUsers(current => type === "delete" ? current.filter(item => item._id !== user._id) : current.map(item => item._id === user._id ? { ...item, isBlocked: data.isBlocked } : item));
      toast.success(type === "delete" ? "Account permanently deleted" : type === "block" ? "Account blocked" : "Account unblocked");
      setAccountAction(null);
      setRefresh(value => value + 1);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update this account.");
    } finally { setPending(null); }
  }

  const [testAccount, setTestAccount] = useState<User | null>(null);
  const [labelError, setLabelError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!testAccount) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [testAccount]);

  useEffect(() => {
    const controller = new AbortController();
    setSummary(null);
    setSummaryError("");
    async function loadSummary() {
      try {
        const response = await fetch("/api/admin/users/summary", { signal: controller.signal });
        if (!response.ok) throw new Error("Account totals are unavailable. Please try again.");
        const data = await response.json();
        if (!controller.signal.aborted) setSummary(data);
      } catch (error) {
        if (!controller.signal.aborted) setSummaryError(error instanceof Error ? error.message : "Account totals are unavailable.");
      }
    }
    void loadSummary();
    return () => controller.abort();
  }, [refresh, summaryRefresh]);

  function closeTestModal() {
    if (pending) return;
    setTestAccount(null);
    setLabelError("");
  }

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
        const params = new URLSearchParams({ search: query, accountType, startDate, endDate, page: String(page), limit: String(limit) });
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
  }, [query, accountType, startDate, endDate, page, limit, refresh]);

  async function toggleTestAccount(user: User) {
    if (pending) return;
    setLabelError("");
    setPending(user._id);
    try {
      const res = await fetch(`/api/admin/users/${user._id}/test-account`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTestAccount: !user.isTestAccount }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Couldn’t update this user.");
      }
      const saved = await res.json();
      if (saved.isTestAccount !== !user.isTestAccount) {
        throw new Error("The test account label wasn’t saved. Please try again.");
      }
      toast.success(saved.isTestAccount ? "Marked as a test account" : "Test account label removed");
      setUsers(current => current.map(item => item._id === user._id ? { ...item, isTestAccount: saved.isTestAccount } : item));
      setTestAccount(null);
      setRefresh(value => value + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn’t update this user.";
      if (testAccount) setLabelError(message);
      else toast.error(message);
    } finally { setPending(null); }
  }

  function clearFilters() {
    setAccountType("registered"); setSearch(""); setQuery(""); setStartDate(""); setEndDate(""); setPage(1);
  }

  const filtered = Boolean(accountType !== "registered" || search || startDate || endDate);
  const busy = loading || search !== query;
  const first = total ? (page - 1) * limit + 1 : 0;
  const last = Math.min(page * limit, total);
  const pageNumbers = Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
    .filter(value => value >= 1 && value <= totalPages).sort((a, b) => a - b);

  return (
    <div className={styles.page}>
      <dialog ref={actionDialogRef} className={styles.testModal} aria-labelledby="account-action-title" aria-describedby="account-action-description" onCancel={event => { event.preventDefault(); if (!pending) setAccountAction(null); }}>
        {accountAction && <div className={styles.modalContent} aria-busy={pending !== null}>
          <button type="button" className={styles.modalClose} aria-label="Close confirmation" disabled={pending !== null} onClick={() => setAccountAction(null)}><X size={20} aria-hidden="true" /></button>
          <p className={styles.modalEyebrow}>Account access</p>
          <h2 id="account-action-title">{accountAction.type === "delete" ? "Permanently delete account?" : accountAction.type === "block" ? "Block this account?" : "Unblock this account?"}</h2>
          <p id="account-action-description" className={styles.modalDescription}>{accountAction.type === "delete" ? "This cannot be undone. Removes the account, purchase records, practice history, reminders, support requests, and community contributions. Discussions on this user’s posts are also removed." : accountAction.type === "block" ? "Stops sign-in, access from existing sessions, and reminders. Account data stays saved, and you can unblock this user anytime." : "Restores sign-in and app access for this user."}</p>
          <div className={styles.modalAccount}><span className={styles.avatar} aria-hidden="true"><Users size={20} /></span><div><strong>{accountAction.user.name || "Unnamed user"}</strong><span>{accountAction.user.email || accountAction.user._id}</span></div></div>
          <p className={styles.modalDescription}>This does not cancel an App Store or Google Play subscription. The user must manage that through their store account.</p>
          {accountAction.type === "delete" && <label className={styles.confirmationLabel} htmlFor="delete-confirmation">Type {accountAction.user.email ? "the email address" : "the full user ID"} above to confirm<input id="delete-confirmation" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" spellCheck={false} disabled={pending !== null} /></label>}
          {actionError && <p className={styles.modalError} role="alert">{actionError}</p>}
          <div className={styles.modalActions}>
            <button type="button" className={styles.modalCancel} autoFocus disabled={pending !== null} onClick={() => setAccountAction(null)}>Cancel</button>
            <button type="button" className={`${styles.modalConfirm} ${accountAction.type === "delete" ? styles.deleteConfirm : ""}`} disabled={pending !== null || (accountAction.type === "delete" && confirmation !== (accountAction.user.email || accountAction.user._id))} onClick={() => void saveAccountAction()}>{pending ? "Saving…" : accountAction.type === "delete" ? "Delete permanently" : accountAction.type === "block" ? "Block account" : "Unblock account"}</button>
          </div>
        </div>}
      </dialog>
      <dialog ref={dialogRef} className={styles.testModal} aria-labelledby="test-modal-title" aria-describedby="test-modal-description" onCancel={event => { event.preventDefault(); closeTestModal(); }} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeTestModal(); } }}>
        {testAccount && <div className={styles.modalContent} aria-busy={pending !== null}>
          <button type="button" className={styles.modalClose} aria-label="Close confirmation" disabled={pending !== null} onClick={closeTestModal}><X size={20} aria-hidden="true" /></button>
          <div className={styles.modalIcon}><FlaskConical size={28} strokeWidth={1.6} aria-hidden="true" /></div>
          <p className={styles.modalEyebrow}>Account label</p>
          <h2 id="test-modal-title">Mark as a test account?</h2>
          <p id="test-modal-description" className={styles.modalDescription}>Confirm you’ve reviewed this account and verified it is used for testing.</p>
          <div className={styles.modalAccount}>
            <span className={styles.avatar} aria-hidden="true"><Users size={20} /></span>
            <div><strong>{testAccount.name?.trim() || "Unnamed user"}</strong><span>{testAccount.email || "No email address"}</span></div>
          </div>
          <div className={styles.modalNote}><Leaf size={18} aria-hidden="true" /><p>This adds a <strong>Test account</strong> badge. Account access and data stay unchanged, and you can remove the label anytime.</p></div>
          {labelError && <p className={styles.modalError} role="alert">{labelError}</p>}
          <div className={styles.modalActions}>
            <button type="button" className={styles.modalCancel} autoFocus disabled={pending !== null} onClick={closeTestModal}>Cancel</button>
            <button type="button" className={styles.modalConfirm} disabled={pending !== null} onClick={() => void toggleTestAccount(testAccount)}><FlaskConical size={16} aria-hidden="true" />{pending ? "Saving…" : "Yes, mark as test"}</button>
          </div>
        </div>}
      </dialog>
      <div className={styles.heading}>
        <div><p className={styles.eyebrow}>Your community</p><h1>Users</h1><p className={styles.subtitle}>The people making presence part of their everyday.</p></div>
        <div className={styles.count} aria-live="polite"><Users size={20} aria-hidden="true" /><div><strong>{busy || error ? "—" : total.toLocaleString()}</strong><span>{filtered ? "Matching users" : "Registered users"}</span></div></div>
      </div>

      <section className={styles.summarySection} aria-label="Account overview">
        <div className={styles.summaryHeading}><h2>Account overview</h2><span>All accounts · independent of table filters</span></div>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}><span>Registered accounts</span><strong>{summary ? summary.totalAccounts.toLocaleString() : "—"}</strong><p>Includes unverified signups and test accounts. App downloads aren’t tracked here.</p></div>
          <div className={styles.summaryCard}><span>Estimated active subscriptions</span><strong>{summary ? summary.estimatedActiveSubscriptions.toLocaleString() : "—"}</strong><p>Unique accounts with a current recorded plan, excluding marked test accounts.</p></div>
          <div className={`${styles.summaryCard} ${styles.testSummaryCard}`}><span>Marked test accounts</span><strong>{summary ? summary.testAccounts.toLocaleString() : "—"}</strong><p>Accounts manually reviewed and labeled as tests by an admin.</p></div>
        </div>
        {summaryError && <p role="alert" className={styles.modalError}>{summaryError} <button type="button" className={styles.textButton} onClick={() => setSummaryRefresh(value => value + 1)}>Retry</button></p>}
        <p className={styles.summaryNote}>Subscription estimates use the latest recorded purchase: 30 days for monthly, 365 days for yearly, and ongoing access for lifetime. Renewals, refunds, and store test purchases may not be reflected. This is not a verified Apple or Google subscription total.</p>
      </section>
      <div className={styles.communityNote}><Leaf size={18} aria-hidden="true" /><p>Review accounts before marking them as tests. Test account badges are labels only; account access and data stay unchanged.</p></div>
      <section className={styles.card} aria-label="User management" aria-busy={busy}>
        <div className={styles.directoryHeading}>
          <div><h2>Community directory</h2><p>Registration, account access, and subscription estimates in one place</p></div>
          <button type="button" className={styles.refreshButton} disabled={busy} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={15} aria-hidden="true" />Refresh</button>
        </div>
        <div className={styles.filters}>
          <label className={styles.searchLabel} htmlFor="user-search">Search users
            <span className={styles.searchField}><Search size={18} aria-hidden="true" /><input id="user-search" type="search" placeholder="Search by name or email" value={search} onChange={event => setSearch(event.target.value)} /></span>
          </label>
          <label htmlFor="user-account-type">Account type
            <select id="user-account-type" value={accountType} onChange={event => { setAccountType(event.target.value as AccountType); setPage(1); }}>
              {Object.entries(accountTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <div className={styles.dateFilters}>
            <label htmlFor="user-start-date">Joined from<input id="user-start-date" type="date" value={startDate} max={endDate || undefined} onChange={event => { setStartDate(event.target.value); setPage(1); }} /></label>
            <label htmlFor="user-end-date">Joined to<input id="user-end-date" type="date" value={endDate} min={startDate || undefined} onChange={event => { setEndDate(event.target.value); setPage(1); }} /></label>
          </div>
          {filtered && <button className={styles.clearButton} type="button" onClick={clearFilters}><X size={15} aria-hidden="true" />Clear filters</button>}
        </div>

        {filtered && <div className={styles.filterSummary} aria-live="polite"><span>Filtered view</span>{accountType !== "registered" && <span className={styles.filterChip}>{accountTypes[accountType]}</span>}{search && <span className={styles.filterChip}>Search: {search}</span>}{startDate && <span className={styles.filterChip}>From {startDate}</span>}{endDate && <span className={styles.filterChip}>To {endDate}</span>}</div>}
        {error ? <div className={styles.empty} role="alert"><Users size={32} aria-hidden="true" /><h2>Users couldn’t load</h2><p>{error}</p><button className={styles.textButton} onClick={() => setRefresh(value => value + 1)}>Try again</button></div>
          : busy ? <div className={styles.empty} role="status"><span className={styles.loadingDot} />Loading users…</div>
          : users.length === 0 ? <div className={styles.empty}><Users size={36} aria-hidden="true" /><h2>{filtered ? "No matching users" : "No users yet"}</h2><p>{filtered ? "Try another account type, name, email, or date range." : "Registered accounts will appear here."}</p>{filtered && <button className={styles.textButton} onClick={clearFilters}>Clear filters</button>}</div>
          : <div className={styles.tableScroll} role="region" aria-label="Users table" tabIndex={0}>
            <table className={styles.table}>
              <thead><tr><th scope="col">User</th><th scope="col">User ID</th><th scope="col">Joined</th><th scope="col">Account access</th><th scope="col">Subscription (estimated)</th><th scope="col" className={styles.actionsHeading}>Actions</th></tr></thead>
              <tbody>{users.map(user => {
                const name = user.name?.trim() || "Unnamed user";
                const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
                const subscription = user.subscription;
                const subscriptionLabel = subscription?.status === "active" ? (subscription.plan === "lifetime" ? "Lifetime access" : "Active subscription") : subscription?.status === "expired" ? "Expired subscription" : subscription?.status === "none" ? "Registered only" : "Needs review";
                return <tr key={user._id}>
                  <td><div className={styles.identity}><UserAvatar image={user.image} initials={initials} /><div><span className={styles.name}>{name}</span>{user.isTestAccount && <span className={`${styles.badge} ${styles.testBadge}`}><FlaskConical size={13} aria-hidden="true" />Test account</span>}<span className={styles.email}>{user.email || "No email address"}</span></div></div></td>
                  <td><span className={styles.userId} title={user._id}>#{user._id.slice(-6)}</span></td>
                  <td className={styles.date}>{joinedDate(user.createdAt)}</td>
                  <td><span className={`${styles.badge} ${user.isBlocked ? styles.blocked : styles.active}`}><span aria-hidden="true" />{user.isBlocked ? "Blocked" : "Active"}</span></td>
                  <td><div className={styles.subscriptionCell}>
                    <span className={`${styles.badge} ${subscription?.status === "active" ? styles.active : subscription?.status === "expired" ? styles.expiredSubscription : styles.neutralSubscription}`}>{subscriptionLabel}</span>
                    <span className={styles.subscriptionDetail}>{subscription?.status === "none" ? "No purchase recorded" : subscription?.status === "unknown" || !subscription ? "Subscription could not be determined" : subscription.plan === "lifetime" ? "Lifetime plan · purchase-based estimate" : `${subscription.plan === "monthly" ? "Monthly" : "Yearly"} plan · ${subscription.status === "expired" ? "Estimated end" : "Estimated until"} ${joinedDate(subscription.estimatedExpiresAt || "")}`}</span>
                    {user.isTestAccount && <span className={styles.subscriptionDetail}>Excluded from subscriber totals</span>}
                  </div></td>
                  <td><div className={styles.actions}>
                    <span className={styles.actionTooltip}>
                      <button type="button" className={styles.testButton} disabled={pending !== null} onClick={() => openAccountAction(user, user.isBlocked ? "unblock" : "block")} aria-describedby={`block-tooltip-${user._id}`} aria-label={`${user.isBlocked ? "Unblock" : "Block"} ${name}`}>{user.isBlocked ? <ShieldCheck size={16} aria-hidden="true" /> : <ShieldBan size={16} aria-hidden="true" />}</button>
                      <span role="tooltip" id={`block-tooltip-${user._id}`} className={styles.tooltipLabel}>{user.isBlocked ? "Unblock account" : "Block account"}</span>
                    </span>
                    <span className={styles.actionTooltip}>
                      <button type="button" className={`${styles.testButton} ${styles.deleteButton}`} disabled={pending !== null} onClick={() => openAccountAction(user, "delete")} aria-describedby={`delete-tooltip-${user._id}`} aria-label={`Delete ${name}`}><Trash2 size={16} aria-hidden="true" /></button>
                      <span role="tooltip" id={`delete-tooltip-${user._id}`} className={styles.tooltipLabel}>{"Delete account"}</span>
                    </span>
                    <span className={styles.actionTooltip}>
                      <button type="button" className={styles.testButton} disabled={pending !== null} onClick={() => { if (user.isTestAccount) void toggleTestAccount(user); else { setLabelError(""); setTestAccount(user); } }} aria-describedby={`test-tooltip-${user._id}`} aria-busy={pending === user._id} aria-label={`${user.isTestAccount ? "Remove test label from" : "Mark as test account:"} ${name}`}><FlaskConical size={16} aria-hidden="true" /></button>
                      <span role="tooltip" id={`test-tooltip-${user._id}`} className={styles.tooltipLabel}>{pending === user._id ? "Saving…" : user.isTestAccount ? "Remove test label" : "Mark as test"}</span>
                    </span>
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
