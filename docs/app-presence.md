# App activity in the admin Users page

The app posts `/api/users/presence` when a signed-in session becomes available,
on foreground resume, and every 60 seconds while foregrounded. A single tracker
above the navigator covers Home and pushed screens. Backgrounding, logout, and
disposal cancel its timer and close its HTTP client. Requests time out after 10
seconds; failures are silent and are not queued for later replay. A 401/403 stops
periodic signals until the next session change or foreground resume.

The authenticated endpoint ignores client-supplied identity, timestamps, and
status. It records server time with `$max` in `User.lastSeenAt`, excluding blocked
or deleting accounts. It does not upsert accounts or change profile `updatedAt`.
No background/offline event overwrites another device's activity. The newest
signal from any device wins; closing the last device expires naturally.

Admin labels:
- Active now: last signal less than 2 minutes ago (green dot).
- Recent activity: minutes, hours, or days ago (gray dot).
- Offline: at least 30 days since last signal (gray dot, elapsed months).
- No activity recorded: missing timestamp, including older app versions.

The Users API adds `lastSeenAt` and `serverNow`, with private/no-store responses.
Filters: `activity=all|active|inactive|untracked`; sorting:
`sort=joined|lastSeen`. These combine with account type, search, and joined-date
filters before pagination. Existing subscription status is independent of app
activity. Active-now queries exclude blocked/deleting accounts.

The admin page polls its current filtered page every 30 seconds while visible,
refreshes on returning to the tab, avoids overlapping requests, and aborts stale
requests when filters change or the page unmounts. A failed/timed-out refresh
shows activity unavailable rather than leaving green indicators. Relative times
advance using server time plus monotonic browser elapsed time. Hover/focus/tap a
status for the exact last-seen timestamp in the administrator's local timezone.

## Rollout

1. Deploy backend/admin changes first, preserving the production dependency baseline.
2. Test using a designated test account: open the updated app, background it for
   more than 2 minutes, resume it, sign out, lose/recover connectivity, and use a
   second device. Check filters and Last seen sorting in admin.
3. Release the updated Flutter app. No historical backfill is required or inferred
   from login/purchase dates. A sparse date index is declared on lastSeenAt.

This is approximate foreground connectivity, not exact attention, session length,
or total minutes spent in the app. A force-close, logout, or network loss can
remain green for up to 2 minutes plus the admin's refresh/render interval.

Local validation uses mocked accounts and HTTP; it does not write production data.
