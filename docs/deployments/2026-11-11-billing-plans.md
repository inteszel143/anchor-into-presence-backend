# Billing history and plan labels — November 11, 2026 (Asia/Manila)

Live commit: `97554f8f5eff5097323fa9270310de8b624bef06`.
Source: `d52330c` with production package.json/package-lock.json retained.
Local branch: `release/billing-plans-20261111` (not pushed).

Changes:
- Billing-history GET includes a saved complimentary yearly grant as a no-charge
  history item, with real grant/expiry dates and no fabricated transaction ID.
  The item participates in pagination without inserting a purchase record.
- Known product IDs take precedence over inconsistent recorded plan labels in
  billing/admin reporting and new purchase writes. Existing rows are not migrated.
- Admin rows, active filters, and summary calculations use matching plan rules.
- Redemption grant creation and ownership handling are unchanged.

Verification:
- 140 backend/admin tests passed locally and on the server.
- Local TypeScript and production compilation/lint/type checks passed.
- Production generated 72 pages; restart health check passed.
- Authenticated Users/summary and mobile billing-history endpoints returned 200.
- Active-filter totals matched summary totals.
- Public .com admin login/app-version returned 200; unauthenticated history GET
  and redemption-fallback POST returned 401.
- Release identity and unchanged production dependency lock were verified.
- The inspected billing-history account had no complimentary entry; no live grant
  was created to test that case. Mocked tests cover grant history and pagination.
- No customer records were modified by verification. The specific reported
  monthly purchase still needs the user's account email to trace it.

Next.js remains 15.5.20. The same reviewed low-storage deployment script reused
byte-identical installed dependencies through hard links, placed build cache in
/dev/shm, and removed its temporary cache after the build. Existing environment
files, uploads, and rollback releases were preserved. Root had about 276 MB free
at completion (df displays 100% usage); additional storage is needed.

Current release: `/var/www/meditation-deploy/releases/97554f8f5eff.49ZUvYsX`.
Rollback: `/var/www/meditation-deploy/releases/fce5a3b410a8.FZXhdbSG`.
Server log: `/home/ubuntu/meditation-deploy/billing-plans-20261111.log`.
Read-only verifier: `/home/ubuntu/meditation-deploy/anchor-billing-verify-20261111.cjs`.
Archive SHA-256:
`e00cc29b2ac2a609a8c4d66d9a40df7a8527602d50458d083468f7decc7ec2d3`.

The mobile Current Plan marker, complimentary history wording, and redemption
loader still require a new iOS build. This deployment does not rebuild or upload
any mobile app.
