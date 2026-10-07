# Admin release review — 2026-10-04

**Recommendation: staging-ready, not yet approved for live deployment.**

## Remaining release gates

1. **Publishing behavior needs confirmation and correction.** `src/app/api/users/home/route.ts` requires `schedulePublish: true`, while the unfiltered activity list also includes unscheduled records. Both endpoints ignore `scheduleTime`; their date/timezone handling also differs. Decide whether unscheduled activities publish immediately and choose the scheduling timezone before changing this shared mobile behavior.
2. **Real integration smoke tests remain.** Browser testing uses mocked API responses. Verify login/logout, database saves, one media upload through S3/CloudFront, and a controlled push to a test device in staging. Never use the production broadcast button as a test.
3. **Lint is not runnable with the current script.** `npm run lint` invokes removed `next lint` and exits with “Invalid project directory …/lint”. Migrate the script/config to ESLint CLI before relying on it as a release gate.

## Verification

- Production build: passed, including TypeScript and generation of all 66 static pages.
- `node --test tests/admin-regressions.cjs`: 6 tests passed. Database, upload, and cookie adapters are mocked; JWT validation is exercised with test credentials.
- `git diff --check`: passed.
- Browser: installed Chrome via Playwright; 1440px and 390px widths; all API requests intercepted; third-party requests blocked. All 17 routes rendered at both widths without document-level horizontal overflow after the category fix. Final targeted checks passed for mobile navigation, FAQ validation/failed-save recovery, activity edit prefill, and comma-separated tag editing. No application page errors in the targeted run; two expected jQuery errors occurred because external scripts were deliberately blocked.
- Build warnings: deprecated middleware filename and ignored legacy `config` exports in two mobile routes. Build succeeds; these should be cleaned up separately.

## Page-by-page review

| Page | Review result / fixes |
| --- | --- |
| Login | Renders at both widths; admin API login explicitly remains public. Actual credentials need staging verification. |
| Dashboard | Cards and recent users render with fixtures; totals use existing APIs. |
| Users | List renders; end-date now includes the whole UTC day; response selects display fields rather than full user documents. |
| Activities list | Renders; category lookup corrected to the model’s `category` field. |
| Add activity | Renders; failed requests release the save button; category-loading failures show feedback. Real file upload pending. |
| Edit activity | Detail response now includes original fields, tags, category, and thumbnail; tags can be typed with commas; date stored separately from boolean flag; saving blocked when loading fails. |
| View activity | Renders; category and activity details use corrected response. Remote media playback pending. |
| Categories list | Renders with fixtures. |
| Add category | Failed requests release the save button; horizontal overflow corrected. |
| Edit category | Handles failed initial load and failed save; corrected submit label; horizontal overflow corrected. |
| View category | Failed requests handled; category naming corrected; horizontal overflow corrected. |
| FAQs | List renders; Add/Edit modal validation, prefill, and failed-save recovery checked. Updating a missing FAQ now returns 404. |
| Support | List renders; resolve request/response contract reviewed. Live mutation not tested. |
| Content | Terms/privacy editor renders; save response contract reviewed. Live content not modified. |
| Notifications | Form and preview render; server now reports push success/failure counts rather than unconditional delivery success. Live broadcast not tested. |
| Profile | Renders; corrected failure message and local email refresh. Live profile upload pending. |
| Change password | Renders; corrected error construction. Actual password not changed. |
| Shared sidebar/header | Mobile overlay stacking fixed and open/close verified; session cookie is cleared on logout; admin APIs reject unauthenticated/non-admin requests. |

## Security/session fixes verified by regression tests

- Admin API paths now go through the existing admin-cookie check; invalid/missing/non-admin/expired cookies return 401 for APIs.
- Logout expires the server cookie instead of only clearing browser storage.
- Removed the profile endpoint’s hardcoded fallback signing secret and enforced its admin role.
- The Users listing no longer returns full model records.

These are targeted corrections, not a complete security audit or proof that all backend routes are secure.

## Test-environment note

The first browser-test server startup used the configured database before discovering that `src/instrumentation.ts` automatically restores cron jobs. It was stopped promptly. Subsequent starts used a deliberately unavailable local database URI and a test-only JWT secret. No UI test sent a real save or notification request. The initial startup’s existing cron-restore routine can remove expired jobs, so zero background database changes during that first startup cannot be certified.

Screenshots and the browser harness are temporary artifacts under `/tmp/anchor-admin-browser/`; committed regression coverage is in `tests/admin-regressions.cjs`.
