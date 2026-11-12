# Mobile notification unread badge

The mobile home bell shows the authenticated user's unread inbox count (99+ for
larger counts; hidden at zero). Read status is stored per user, shared across their
devices, and does not change the notification-receiving preference.

GET /api/users/notifications?page=1 now requires a user bearer token and adds
`unreadCount` across the whole inbox and `isRead` on each returned item. Existing
pagination fields remain unchanged. PATCH to the same path accepts a single
`notificationId` and idempotently marks it read for the authenticated user. The
client cannot select another user's identity. Missing notifications return 404.

Receipts use the notification_reads collection with a unique compound index on
(userId, notificationId). Existing messages initially count as unread because no
historical per-user read state exists. The inbox remains the existing shared
announcement feed. Scheduled device reminders that are not stored in this inbox
do not contribute to its unread count.

Mobile refreshes on home entry, notification-screen entry, app resume, and
foreground/opened push events. The screen shares the home notification bloc and
opens a scrollable detail modal when a message is tapped, marking that message
as read through the backend, and provides pagination. Updates are serialized; failed
writes preserve unread state and show a retry message. Opening the list alone does not mark messages read; opening an individual
message does. An older server without unreadCount shows no badge or read
actions until this backend update is deployed.

Release backend first, then ship the mobile update. This implements the in-app
bell badge, not the OS launcher icon badge. No push messages were sent during
implementation or tests.
