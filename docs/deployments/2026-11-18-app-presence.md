# App presence — deployed November 18, 2026

Source commit: `3e665f5fac35a3011bfb6d841d75722e8661e794`.
Live release: `ef1164cf5a720196583f3b3ec437fab0f281eaf8`.
Local release source: `/private/tmp/anchor-presence-release-20261118`.
Production package.json and package-lock.json are unchanged from the prior release;
Next.js remains 15.5.20.

Includes the authenticated foreground heartbeat endpoint, lastSeenAt storage,
and the admin Users activity display, filtering, sorting, and automatic refresh.

Validation:
- 170 backend/admin tests passed locally and on the production host.
- Four deployment-script tests passed locally.
- Production compilation, lint/type validation, and page generation passed.
- PM2 restart and social-login validation health check passed.
- Public HTTPS admin login and app-version returned 200 on both .com and .net.
- Unauthenticated heartbeat POST and admin user activity GET returned 401 on both domains.
- Deployed endpoint/admin source checksums match the requested source.
- Release identity, dependency checksums, compiled presence route, uploads, and rollback verified.
- No authenticated production heartbeat or admin session was exercised; no designated
  test-account session was available. Verification did not create account activity.

Current: `/var/www/meditation-deploy/releases/ef1164cf5a72.EtWVzSbW`.
Rollback: `/var/www/meditation-deploy/releases/20c2f5fd544c.tp7s2kvs`.
Earlier rollback retained: `/var/www/meditation-deploy/releases/772034e1e73e.pihOiBcx`.
Uploads: `/var/www/meditation-deploy/releases/legacy-before-admin-20261003/public/uploads`.
Log: `/home/ubuntu/meditation-deploy/presence-20261118.log`.
Archive SHA-256: `f7811a2fba908bb104f20a13a713251ec62f5b27b43207aa9b3659ae931c6d4a`.

Deployment-space cleanup removed only node_modules from these unused old releases:
`0ad668634880.9lVqqfvm`, `3654b96fa413.yrdWQO8f`.
Their source, configuration, builds, and uploads remain. Those two old releases
need dependencies reinstalled before reuse. Current/recent rollback releases were
not cleaned. Free disk after deployment: approximately 2.7 GB.

The updated Flutter app must run to send foreground heartbeats. This deployment
has not built or published a mobile app release.
