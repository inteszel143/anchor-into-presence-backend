# Meta app measurement

Status: implementation is disabled by default. No deployment, Meta asset setup,
campaign publishing, or production event validation is implied by this change.

The agreed rollout and assessment are saved in [Advertising roadmap](advertising-roadmap.md).
The backend now maps verified payments into shared events (`advertising/events.ts`)
and delegates Meta formatting and transport to `advertising/adapters/meta.ts`.
Existing flags, ledger keys, Meta order IDs, consent checks, and the single Meta
delivery state remain in place. Additional destinations require independent
delivery records before enabling fan-out; interfaces alone do not provide that.

## Data flow

The Flutter bridge uses Meta's native SDK to activate the app only after consent.
Automatic purchase logging and automatic screen/URL metadata collection are off.
The authenticated consent API stores the SDK anonymous installation ID. A purchase
captures that identity once; later devices cannot silently replace its ad source.
No email, journal, meditation selection, or community content is sent to Meta.

The existing purchase write also persists an `advertisingPending` flag. The worker
turns that flag into a durable verification job, without holding purchase fulfillment
open for a call to Apple, Google, or Meta. Payment/access logic remains separate.

Apple transaction data comes from its authenticated Server API; price is converted
from milliunits. Apple notification signatures are verified with Apple's library,
trusted Apple root certificates, bundle ID, environment and app ID. Google RTDN
requests require a verified Pub/Sub OIDC token with the configured audience and
service-account email. Google payments use the Orders API's actual total, never
`recurringPrice` or the price supplied by the mobile app.

Each verified store transaction gets one ledger key. Monthly/yearly plans use the
server's known product catalog. Unknown products, missing prices, ownership conflicts,
and transient store failures remain retryable and eventually enter `review`.
Free transactions and sandbox payments are recorded but excluded from Meta revenue.
The `fb_mobile_purchase` event contains product, plan, amount, ISO currency, original
purchase time, stable hashed order reference, and initial/renewal classification.

## Server configuration

Set these through the deployment secret/configuration manager, never source control:

| Variable | Purpose |
| --- | --- |
| `AD_MEASUREMENT_ENABLED=true` | Enable verification and notification ingestion |
| `AD_STORE_ENVIRONMENT=production` | Use `sandbox` only on an isolated test deployment/database |
| `META_DELIVERY_ENABLED=false` | Keep false until account setup and test validation are complete |
| `AD_WORKER_SECRET` | Long random bearer secret for the scheduled worker |
| `META_APP_ID` | Business-owned Meta developer app ID |
| `META_APP_ACCESS_TOKEN` | Server-only token authorized for that app's activities API |
| `META_GRAPH_VERSION=v24.0` | Explicit supported version; verify against the configured Meta app |
| `APPLE_ISSUER_ID`, `APPLE_KEY_ID`, `APPLE_BUNDLE_ID`, `APPLE_PRIVATE_KEY_PATH` | Existing App Store Server API credentials |
| `APPLE_APP_ID` | Numeric App Store app ID, required for production signature verification |
| `APPLE_ROOT_CERT_PATHS` | Comma-separated local paths to DER Apple root certificates downloaded from Apple's PKI |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_PATH`, `GOOGLE_PLAY_PACKAGE_NAME` | Existing Play API credentials; grant order/subscription read access |
| `GOOGLE_RTDN_AUDIENCE` | Exact audience configured for the authenticated Pub/Sub push subscription |
| `GOOGLE_RTDN_SERVICE_ACCOUNT_EMAIL` | Expected Pub/Sub push service-account identity |

Configure App Store Server Notifications V2 to POST to `/api/advertising/apple`.
Configure Play RTDN through authenticated Pub/Sub push to `/api/advertising/google`.
Preserve any existing notification integrations when arranging these destinations.
Run an external scheduler once per minute: POST `/api/advertising/worker` with
`Authorization: Bearer <AD_WORKER_SECRET>`. The worker processes bounded batches;
monitor backlog and increase scheduling capacity when needed. Protect scheduler
credentials and avoid logging request bodies or authentication headers.

## Meta account setup

Assign a developer role on the Meta developer app and appropriate event-source/ad
account access. Configure the iOS bundle/App Store IDs and Android package, store
listing and signing hashes where required. Connect the business-owned app to the
advertising account. Finish the mobile configuration in
`frontend/docs/meta-measurement.md` in the sibling repository.

Confirm app activation and server purchases in Events Manager before enabling
paid-conversion campaigns. An event's successful API response is not proof of ad
attribution or optimization eligibility. Confirm the app events integration and
anonymous-ID matching with the actual Meta account. Configure Meta's supported iOS
aggregate attribution settings separately; this version does not emit events when
the person declines the app consent request or iOS ATT permission.

## Validation and operations

1. On an isolated sandbox deployment, enable verification and keep Meta delivery off.
2. Exercise monthly/yearly purchases, discounts, free trials, restores, duplicate
   notifications, delayed login and renewal while the app is closed. Sandbox ledger
   values must be correct and must never become Meta purchases.
3. Check `/api/admin/advertising` using an authenticated admin session. It shows job
   counts and payment totals grouped by state, plan, currency and environment, plus
   the latest 100 payments. Never sum unlike currencies or sandbox with production.
4. Validate both accepted and denied consent, consent withdrawal, switching accounts,
   missing credentials, transient store errors and account deletion.
5. After Meta setup, perform a controlled real purchase and confirm its exact value
   and event receipt. Validate ad attribution with a real test campaign before rollout.
6. Monitor `review`, `uncertain`, stale `sending`, and old pending jobs. Only reset a
   delivery after checking Events Manager: `/activities` is not assumed to guarantee
   idempotency. A lost response or worker crash must not cause blind duplicate revenue.

Verification retries use exponential backoff, up to 20 attempts. Definite delivery
rejections enter `review`; unknown network outcomes enter `uncertain`. This favors
avoiding duplicate revenue over automatic replay of ambiguous sends. Server events
older than seven days are excluded rather than backdated as new conversions.

## Boundaries

- This is a forward measurement pipeline, not a historical revenue backfill. Old
  clients lack consent/installation context and cannot be attributed retrospectively.
- Identity is captured when a purchase first reaches the authenticated backend.
  Anonymous purchases sync after sign-in. Missing context is excluded, not guessed.
- Consent expires after 30 days without an app refresh. Renewals are still verified
  in the ledger, but are not sent to Meta without current matching consent. An offline
  consent withdrawal reaches the server on the next successful sync; the SDK stops
  collecting new events immediately. No server can observe an offline OS ATT change.
- Google RTDN exposes the latest successful order at verification time. The worker
  queues intervening renewal order numbers, with a 120-order safety limit; larger gaps
  require a controlled backfill. Apple uses each notification's transaction ID.
- Refunded/revoked payments are not newly emitted, but post-delivery refunds are not
  yet subtracted from Meta revenue. Use store financial reports for net revenue.
- The verified ledger is not a new entitlement or app-account ownership authority;
  it uses existing purchase-account associations and rejects conflicting owners.
- Meta may aggregate/model attribution, and may not expose arbitrary plan parameters
  as Ads Manager breakdowns. Exact plan/value records are available in the backend.

References: [Meta activities API](https://developers.facebook.com/docs/graph-api/reference/application/activities/),
[Apple price units](https://developer.apple.com/documentation/appstoreservernotifications/price),
[Google Orders API](https://developers.google.com/android-publisher/api-ref/rest/v3/orders),
[Apple notification verifier](https://github.com/apple/app-store-server-library-node).
