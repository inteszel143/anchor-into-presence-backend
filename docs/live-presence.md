# Live admin presence (SSE)

The mobile app sends `POST /api/users/presence` with its bearer token and
`{ sessionId, sequence, active }`. A random ID is scoped to the signed-in app
instance; sequence increases for every foreground, heartbeat and leave signal.
Resume reuses the ID. Token changes close the previous session using its captured
token. A heartbeat runs every 60 seconds while foregrounded. Background/logout
sends a best-effort inactive signal with its own HTTP client.

The backend updates one User document atomically. `presenceSessions` is private,
tracks each app instance separately, and retains closed-session tombstones for
24 hours (pruned on subsequent writes). Duplicate/out-of-order sequence numbers
are ignored. Any unexpired active session keeps `presenceUntil` in the future;
leaving the last device clears active status immediately. A device lost without
a leave signal expires 120 seconds after its last heartbeat. `lastSeenAt` uses
server time and is never moved backwards. Profile `updatedAt` is unchanged.

Empty-body requests from older apps still work through `legacyPresenceUntil`;
those apps cannot report immediate departure. Deploy the backend before releasing
the updated mobile app. Existing users without presenceUntil retain the previous
last-seen-based interpretation until their next signal. No backfill is required.

The admin page subscribes to `/api/admin/users/presence/stream` using the existing
HTTP-only admin cookie. This is SSE, not WebSockets. Successful presence writes
update a shared MongoDB revision document. Each connected SSE handler checks this
small document once a second, so changes reach admins in roughly 1 second plus
network and query time, across processes/hosts and without a replica set or Redis.
This is a database-polled relay, not MongoDB change streams. Monitor the shared
revision write load and one revision read/second/admin connection when scaling.

Events invalidate the current filtered page, which fetches authoritative rows,
counts and server time. Requests are serialized; events during a fetch trigger a
follow-up refresh. SSE resyncs every 15 seconds for expiry, moderation, and a
possible failed revision publication. New connections always resync; replay IDs
are unnecessary. Hidden tabs close their stream and reconnect when visible.
Browsers retry dropped streams; 30-second HTTP polling is a degraded fallback.
The page updates relative labels locally. After 30 days the avatar is gray and
the tooltip includes the number of months since activity.

Connections close at token expiry or after five minutes to revalidate the admin
cookie. Abort/cancel stops timers; slow consumers are disconnected rather than
buffering indefinitely. The endpoint never includes user details in events.

## Deployment checks

Not yet deployed. Deploy API/model/admin changes together, then release Flutter.
Ensure the reverse proxy/CDN passes streaming responses without buffering. The
endpoint sends `X-Accel-Buffering: no` and `Cache-Control: private, no-store,
no-transform`. For an Nginx location serving this route, use `proxy_buffering off`,
`proxy_cache off`, `proxy_read_timeout 60s`, and HTTP/1.1 upstream forwarding.
Keep the existing upstream/auth configuration. Confirm that any compression or
CDN layer flushes events; do not cache this endpoint.

Verify with two devices on a designated test account: open both, close one
(still green), close the other (Just now), resume (green), then force-kill/offline
and wait for expiry. Test an active-only filter, reconnect, session expiry and
unauthenticated stream rejection. These checks must run against the actual proxy
before treating production delivery as verified.

## Local checks

- `node --test tests/app-presence.test.cjs tests/presence-stream.test.cjs tests/admin-regressions.cjs`
- `npx tsc --noEmit --incremental false`
- Flutter: `flutter test test/app_presence_test.dart`
- Integration: run an isolated `mongod` on localhost port 27229, then
  `RUN_PRESENCE_INTEGRATION=1 node --test tests/presence-integration.test.cjs`.
  This test uses only the fixed local `aip_presence_test` database and removes its
  test user. It does not read production credentials.
