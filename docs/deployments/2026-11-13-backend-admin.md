# Backend and admin deployment — November 13, 2026 (Asia/Manila)

Live commit: `ee8237a59ddc881be969cd2eb23a7e9bc2a46bb0`.
Source: `464ae89`; production package.json and package-lock.json retained exactly.
Local release branch: `release/backend-admin-20261113` (not pushed).

Includes Apple subscriber reporting, notification unread/read APIs, and subscription plan reporting corrections. Next.js remains 15.5.20.

Validation:
- 156 backend/admin tests passed locally and on the production host.
- Local TypeScript checks and four deployment-script tests passed.
- Production compilation, lint/type validation, and restart health check passed.
- Authenticated subscriptions page, user summary, notification inbox, and billing history returned 200. Notification unread count and per-item read flags were verified. Active user totals matched the summary.
- Apple production report returned 200: 7 checked purchases, 5 confirmed active subscribers, and 32 accounts needing review. These are confirmed saved-record results, not a complete App Store subscriber total.
- Public admin login returned 200 on both .com and .net; public app-version returned 200. Protected subscriber, notification, purchase, and redemption endpoints rejected unauthenticated requests with 401.
- Verification made no customer-record mutations and sent no notifications. Mark-read writes and real login flows were not exercised against production.

Deployment reused byte-identical dependencies through hard links and used /dev/shm for temporary build cache. Existing environment files, uploads, and previous releases were preserved. Root has approximately 159 MB free and needs additional capacity before future deployments.

Current: `/var/www/meditation-deploy/releases/ee8237a59ddc.P89JJdz9`.
Rollback: `/var/www/meditation-deploy/releases/97554f8f5eff.49ZUvYsX`.
Server log: `/home/ubuntu/meditation-deploy/backend-admin-20261113.log`.
Read-only verifier: `/home/ubuntu/meditation-deploy/anchor-verify-20261113.cjs`.
Archive SHA-256: `8da8f940234081d801bcd85e275df7b53e393b94da3676877989f03e15d9d9ca`.

The mobile app was not rebuilt or uploaded by this deployment.
