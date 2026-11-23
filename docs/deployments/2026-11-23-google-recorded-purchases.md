# Google recorded purchases — November 23, 2026 (Asia/Manila)

Live release: `8a6538479b90e5f95bd07195e9111eba25ec18c2`.
Base: `8cd41b3a2dc46669fd953bf9cdfaee9a0b76db48`.
Prepared in `/private/tmp/anchor-google-recorded-20261123`.

Google Subscribers now displays existing Android purchase records without tokens
in a separate, searchable, paginated Recorded purchases section. It includes
legacy GPA records with no platform field and deduplicates account/order pairs.
These records are explicitly unverified, have unknown production/test environment,
and do not increase Google-confirmed subscriber totals. No purchase insertion or
entitlement changes were made.

Validation:
- 161 production-baseline tests passed; one opt-in integration test skipped.
- Local workspace TypeScript passed. Release-only local TypeScript lacked the
  intentionally omitted Firebase key JSON; the production build/type checks passed
  with the retained server configuration.
- Deployed aggregation executed read-only against production: 9 deduplicated
  recorded purchases; the reported customer's founding annual purchase appears once.
- Public login returned 200; anonymous Google subscriber API returned 401.
- Deployment social-login validation health check passed. Authenticated browser
  rendering was not exercised; component rendering/search has automated coverage.

Deployment incident and recovery:
- Initial npm installation filled the server disk and failed before activation.
  MongoDB stopped after its diagnostic-file write failed during disk exhaustion.
- Removed only this attempt's incomplete release and cleared disposable npm cache.
- Retried with the existing deployment script, replacing npm installation with
  byte-for-byte package.json/package-lock.json comparison and a symlink to the
  previous release's node_modules. All build/test/rollback/health checks retained.
- Restarted MongoDB after freeing space; confirmed active and successfully read
  the reported purchase. Final free disk space was about 485 MB (99% used).
- Existing releases and customer data retained. The current node_modules symlink
  depends on `/var/www/meditation-deploy/releases/8cd41b3a2dc4.uXseYsE6/node_modules`;
  retain that release while this dependency is in use.

Rollback release: `/var/www/meditation-deploy/releases/8cd41b3a2dc4.uXseYsE6`.
Server retry log: `/home/ubuntu/meditation-deploy/google-recorded-20261123-retry.log`.

## Unified list follow-up

Live release: `a6d81e071078862552841437de67ef407012ca38`, based on the
release above. Removed the separate recorded-purchases section and combined all
entries in Subscriber list with shared search, pagination, and status filtering.
Recorded purchases retain unverified labels and appear under Needs review.

Validation: 161 tests passed, one opt-in test skipped; production build and health
checks passed. A read-only deployed aggregation returned 9 recorded purchases.
Rendering the deployed component with those rows confirmed one table, the reported
customer present, and the old heading absent. Login returned 200 and anonymous
subscriber API returned 401. No authenticated browser session was used.

Before building, cleared only regenerable webpack caches in retained releases,
raising free space from about 485 MB to 2.0 GB. Required at least 1 GB free before
starting deployment; MongoDB remained active. Deployment reused the identical
existing dependencies as above. Rollback release:
`/var/www/meditation-deploy/releases/8a6538479b90.EwNzgvhu`.
