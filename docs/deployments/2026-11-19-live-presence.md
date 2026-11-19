# Live presence and compact badges — deployed November 19, 2026

Source commit: `0a65452`.
Live release: `9bfb8675fa30db6a87ac2a5bf7234b487517121f`.
Release source: `/private/tmp/anchor-live-presence-release-20261119`.
Production dependencies are unchanged; Next.js remains 15.5.20.

Includes per-session mobile presence API support, authenticated admin SSE,
multiple-device aggregation, ordered signals, and compact green last-seen badges.
No mobile release or Shorebird patch was published.

Validation:
- 172 backend/admin tests passed locally and on production; one opt-in isolated
  MongoDB integration test was skipped in these suites (previously passed locally).
- Four deployment-script checks passed locally.
- Production build, lint/type checks, and page generation passed.
- PM2 restart and social-login validation health check passed.
- Both public .com and .net domains: login/app-version returned 200; anonymous
  presence POST and admin SSE returned 401.
- Authenticated SSE tested through public HTTPS using a 90-second deployment-only
  admin JWT kept solely in process memory. First events arrived in 21ms (.com)
  and 29ms (.net); both delivered a second event after about 15 seconds.
  No real user presence or account records were changed by these checks.
- Deployed users-page, badge CSS, SSE route, and dependency checksums match source.
- Upload storage and rollback retained; no Nginx changes were necessary.

Current: `/var/www/meditation-deploy/releases/9bfb8675fa30.6rnrkNyQ`.
Rollback: `/var/www/meditation-deploy/releases/ef1164cf5a72.EtWVzSbW`.
Log: `/home/ubuntu/meditation-deploy/live-presence-20261119.log`.
Archive SHA-256: `d6f430c31ccba6bdbedca840fc7fcdf054d05a0b0ac625dc97056df13fd675b8`.
Free disk after deployment: approximately 1.5 GB (97% used). Plan storage cleanup
or expansion before another deployment; current and rollback releases were retained.

New mobile signals require the updated Flutter build/patch. Older apps retain
heartbeat compatibility but cannot report immediate background/logout transitions.
