# Backend and admin deployment — November 8, 2026 (Asia/Manila)

Live release: `be16170bed99effd7927064e995950885bc11444`.
Local release branch: `release/subscription-20261108` (not pushed).
Source: `9c783680be31ace25ef8343a6128000eacb31978`, with the existing production
package.json and package-lock.json retained. Next.js remains 15.5.20.

The backend and admin panel were deployed together through `scripts/deploy-aws.sh`.
Changes from the previous live release are the purchase retry/ownership handling,
the partial unique purchase delivery index, tests, and supporting documentation.
No framework upgrade was included.

Validation:
- 107 backend tests passed locally and on the server.
- 16 additional admin regression tests and four deployment-script tests passed locally.
- Local TypeScript checks passed with a temporary empty Firebase JSON import stub;
  the uploaded archive did not include the stub or credentials.
- Server production compilation, lint/type checks, and generation of 71 pages passed
  with the preserved server configuration and real server-local credentials.
- Uploaded SHA-256: `96b99afeed911786ffa5583665d3d507946992b2517c88c23b393f0ace81c630`.
- Production dependency lockfile SHA-256 remained
  `0f13bce25ebaa77b7142ee5bff9488322c93658c0d10973acf2d10ba598a6199`.
- PM2 restarted; the deployment health check passed and DEPLOYED_COMMIT matched.
- Both .com and .net admin login URLs returned HTTP 200; the .com public
  app-version API returned HTTP 200.
- Server-local authenticated requests returned HTTP 200 for dashboard, Users,
  Users API, Users summary, and admin app-version API. No user response data or
  authentication tokens were exported.
- Unauthenticated purchase POST was correctly rejected with HTTP 401.
- The live purchase model's indexes were ensured and inspected: deliveryKey has
  a unique partial index applying only to string keys. No purchase/user records
  were inserted, deleted, or modified by the verification script.
- Configured Apple and Google credential files still exist.

Current release: `/var/www/meditation-deploy/releases/be16170bed99.beTtBVQi`.
Rollback release: `/var/www/meditation-deploy/releases/acb7bf60a2d1.KKFd9Ywm`.
Server log: `/home/ubuntu/meditation-deploy/subscription-20261108.log`.
Server verification script: `/home/ubuntu/meditation-deploy/verify-subscription-be16170.cjs`.

Disposable Next.js caches and the temporary memory-backed npm cache were cleared.
Previous releases, production configuration, credentials, and uploads were retained.
Final root filesystem free space: approximately 481 MB (99% used). Storage needs
additional capacity or a separately reviewed release-retention cleanup.

This deployment does not release either mobile app. No real store purchase or
redemption was performed. The remaining store verification and renewal/expiry
limitations documented in `../redeem-code-recovery.md` remain unchanged.
