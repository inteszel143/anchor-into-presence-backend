# Admin redemption status — November 10, 2026 (Asia/Manila)

Live release: `fce5a3b410a8a75a1c29127c005b44517482d8f6`.
Local release branch: `release/admin-redemption-20261110` (not pushed).

Admin Users now includes valid redemptionYearlyExpiresAt grants in registered/test
rows, the active-only filter, and the active subscriber summary. Grant rows show
Active subscription / Yearly plan / Complimentary until the recorded expiry.
Active purchase estimates retain their existing behavior and take display
precedence. Test accounts remain excluded from active totals. No mobile or grant
creation behavior was changed in this release.

Validation:
- 136 tests passed locally and on the production server.
- Local TypeScript checks and production compilation/lint/type checks passed.
- 72 pages generated; deployment health check passed after restart.
- Authenticated Users page, Users API, and summary API returned 200.
- Active-filter total matched summary estimatedActiveSubscriptions.
- Public .com admin login and app-version endpoints returned 200.
- Read-only production inspection found zero stored complimentary grant records.
  Therefore a real granted account could not be validated. The specific user's
  email is still needed to investigate their reported redemption/account state.
- No customer records were modified and no real redemption was performed.

Dependency versions remained unchanged (Next.js 15.5.20). The deployment reused
identical dependencies through hard links and placed disposable build cache in
/dev/shm, as documented in the preceding redemption deployment. Cache was removed.
Approximately 333 MB remained available on root; further capacity is needed.

Current: `/var/www/meditation-deploy/releases/fce5a3b410a8.FZXhdbSG`.
Rollback: `/var/www/meditation-deploy/releases/794cd9271443.kS6ekKTz`.
Log: `/home/ubuntu/meditation-deploy/redemption-20261110/admin-deploy.log`.
Read-only verifier: same directory, `anchor-admin-grant-verify.cjs`.
Archive SHA-256:
`b54ed18c637d57820a3006d65c613fc1903e2c35a6bb8609a41b5cbe9bfd4d73`.
