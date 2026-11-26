# Advertising attribution and analytics roadmap

## Agreed direction

Project memory recorded on 2026-11-26: finish and validate the Meta integration in
the mobile app and backend first, then expand to TikTok and Google Ads. YouTube
uses the Google Ads connector and is a reporting channel where supported.
Prepare shared backend interfaces now so future integrations reuse verified
business events rather than duplicate purchase or subscription logic.

The original assessment was read-only. The subsequent user request authorizes
saving this plan and preparing the shared backend structure. It does not itself
authorize enabling new destinations, changing store/account settings, migrating
production data, launching campaigns, or deployment.

## Current architecture

- Mobile: Flutter/Dart, BLoC and Provider; not React Native or Expo.
- Backend/admin: TypeScript Next.js App Router, React admin, MongoDB/Mongoose.
- Repository dependencies request Next 16; the earlier production deployment used
  Next 15.5.20. Reconfirm the runtime baseline before a future release.
- Authentication: email/password and OTP verification, plus Apple/Google social
  login and JWT sessions. Registration completion belongs after verification or
  new social-account creation, not an OTP request or every login.
- Purchases: Flutter in_app_purchase with Apple/Google implementations, pending
  purchase synchronization, delivery retries and restores.
- Meta: consent-gated mobile activation, backend store verification and payment
  jobs, and server purchase delivery. Flags default off. Code presence does not
  establish actual account setup, scheduling, production receipt or attribution.
- Firebase Core, Auth and Messaging exist; Firebase Analytics instrumentation is
  not present. app_links currently handles content links, not acquisition.
- Apple offer evidence recognizes ANCHORVIP and ANCHORAMBASSADOR. Complimentary
  yearly access is separate and is not proof of a store redemption.
- There is an admin advertising diagnostics API, but no acquisition/spend/ROAS
  dashboard or stored campaign attribution.

## Shared structure prepared

`src/lib/advertising/contracts.ts` defines a verified purchase event, conversion
adapter/result interface, and a separate campaign reporting interface.
`events.ts` creates an immutable, allowlisted event from an already verified
payment. Its ID separates environments/stores and remains stable on retries.
It does not accept client data as proof of payment or create attribution.
The optional future delivery key separates event, destination and account.

`adapters/meta.ts` owns the existing Meta payload and HTTP transport. The worker
still owns database claiming, ownership, consent and persistence. `payment.ts`
retains `metaEvent` as a compatibility wrapper; existing order IDs remain stable.

Only Meta is implemented and selected. TikTok and Google Ads are contract values,
not runnable adapters. There is no automatic multi-platform fan-out. Current
ledger keys and schemas remain unchanged. Money is still represented as the
existing number type; precise storage is a future schema decision.

## Assessment and reusable components

The feature is feasible without replacing the app, backend or database. Reuse
existing user IDs, store clients, purchase recovery, verified payment normalization,
job leases/retries, consent handling, deletion cleanup and admin UI/authentication.

Keep three independent sources of truth: verified business events, attribution
evidence, and advertising-platform reports. Sending a conversion does not reveal
the acquiring campaign. Platform-reported totals can overlap and must not be
summed as unique customers or verified revenue.

Prefer evaluating an MMP before custom cross-network attribution. A hybrid design
keeps business events and verified revenue in our backend while a supported MMP
provides attribution evidence/exports. Select based on Flutter support, network
coverage, permitted raw/aggregate exports, deferred links, privacy and pricing.
The provider and budget have not been selected.

## Target event and processing architecture

1. Mobile captures permitted first launch, plan selection, session/link signals
   with stable event IDs and a persistent bounded retry queue.
2. Backend produces registration-completed/login events at authenticated success
   boundaries. Anonymous installation history links only after authentication.
3. Store notifications and API checks produce verified purchases, renewals and
   lifecycle transitions; mobile catalog price is never authoritative revenue.
4. Persist canonical events and financial records independently of ad delivery.
5. Apply consent/identity/age eligibility for each destination, then send through
   its adapter using a dedicated delivery record and destination-specific policy.
6. Import campaign/spend reports separately and build indexed daily aggregates.

Events: first launch, registration completed, optional login, plan selected,
subscription purchased/renewed, auto-renew disabled, expired, refunded/revoked,
promotional redemption, and separate complimentary grants. Cancellation is not
expiry. Restores are not new paid conversions. Free and sandbox activity may be
retained internally but must not become paid production advertising revenue.

Canonical records need version, event ID, occurred/received timestamps, user and
installation references, store/environment, product/plan, verified money/currency,
transaction/lifecycle reference, consent reference, attribution reference and
verification status. Preserve campaign/account IDs; names are mutable metadata.

## Future data model

Do not duplicate user accounts, favorites or purchase history. Add references and
derived records with an explicit, separately reviewed migration plan:

| Record | Purpose |
| --- | --- |
| AnalyticsInstallation | First-seen OS/version, permitted SDK IDs and account-link history |
| AnalyticsEvent | Deduplicated canonical events with user/payment references |
| Extended AdPayment | Verified finances, precise money and adjustment history |
| AttributionAssignment | Source, model/window, evidence, campaign/account IDs and revisions |
| EventDelivery | Independent event/destination/account delivery and reconciliation state |
| AdvertisingAccount and Campaign | External IDs, currency, timezone and connection metadata |
| CampaignDailyMetrics | Spend, impressions/clicks, reported conversions, source and freshness |
| Extended consent | Device/purpose/vendor scope, version, audit and withdrawal |
| Optional subscription projection | Store-derived lifecycle state referencing existing purchases |

Current AdPayment.state is Meta delivery state. Before a second destination is
enabled, separate it from payment verification and migrate existing Meta delivery
history without replaying sent/excluded/uncertain records. A Meta timeout must not
prevent a separate destination's independently eligible delivery.

Use unique compound keys, exact money representation, bounded event retention,
secret-manager references and per-destination deletion handling. Include app and
environment identity in future persistence keys. Confirm MongoDB transaction
support before selecting an outbox strategy; the existing app supports standalone
database behavior in some cleanup paths. Start with durable Mongo jobs and a
separate worker; add managed queues or a warehouse only when justified by volume.

## Mobile and platform requirements

- Shared Flutter analytics interface, installation/session identity, consent,
  offline retries, authenticated linking and account-switch/reinstall tests.
- Extend existing content links for campaign evidence; use Android Install
  Referrer or supported MMP callbacks. UTM values are not verified attribution.
- Meta: existing SDK and App Events /activities adapter; validate Events Manager,
  anonymous-ID matching, native builds and conversion eligibility. CAPI for app
  events is a future evaluated alternative, not an additional duplicate sender.
- Meta reporting: separate Marketing API/ads_read account access and connector.
- TikTok: supported native SDK/Flutter bridge or MMP, App ID and advertiser access,
  supported app-events server API and independent reporting API authorization.
  Do not assume website Events API configuration covers native app attribution.
- Google: add Firebase Analytics/GA4, link Google Ads, configure conversion actions
  and valid Firebase app-instance IDs for server supplementation. Review automatic
  purchases so they do not duplicate backend conversion revenue.
- YouTube: Google reporting channel where supplied; otherwise retain unallocated
  Google inventory. No separate YouTube conversion sender.
- API access, quotas, approval requirements and SDK versions must be rechecked
  during implementation. Do not save credentials in this document or source.

## Admin reporting and definitions

Advertising Analytics views: Acquisition, Campaign Performance, Subscription
Conversion, Spend and CAC, Revenue and ROAS, and Integration/Data Quality.
Filters: dates, timezone, currency, platform, account/campaign, OS/store,
environment, attribution model/window and cohort. Show last sync and coverage.

Existing records support user/plan counts and some redemption reporting. Verified
payment coverage depends on completed worker processing. Campaign attribution,
install counts, spend, impressions and clicks require new data integrations.

- CPI = spend / attributed installs.
- Registration cost = spend / attributed completed registrations.
- Paid-subscriber CAC = spend / unique first-time paying subscribers.
- ROAS = attributed revenue / advertising spend.
- ROI requires profit and relevant costs, including refunds and fee treatment.
- Separate initial payments from renewals; never sum incompatible currencies.
- Separate calendar-period revenue from acquisition-cohort revenue.
- Unknown attribution is not automatically organic. Show N/A for missing data.
- Keep verified backend revenue and platform-reported/modelled conversions distinct.

## Privacy and technical gaps

ATT and consent are not bypassed by server reporting. iOS SKAdNetwork/AdAttributionKit
data may be aggregate, delayed or suppressed; never attach aggregate postbacks to
named users. Preserve initial acquisition and represent retargeting separately.
Do not infer historical attribution without evidence or use fingerprinting.
Keep mood, meditation, journal and community content out of ad payloads.

Before production analytics, review these actual code limitations:
- Social login lacks visible server verification of provider identity tokens.
- UserPurchase contains app-reported values; profile expiry uses fixed 30/365 days.
- Advertising notification coverage is focused on purchase/renewal, not the full
  cancellation/expiry/refund lifecycle. Post-delivery refunds are not subtracted.
- Consent currently has one anonymous ID per user and expires after 30 days.
- Late login, token replacement, upgrades and ownership chains need further tests.
- Current seven-day Meta eligibility and uncertain outcomes need explicit handling.
- Deletion removes advertising records; define permitted anonymous aggregate retention.
- Production storage was tight during the earlier deployment; reassess capacity.

## Rollout and estimate

First finish Meta account configuration, mobile release, worker/notification setup,
consent and controlled purchase validation. Receiving a successful API response is
not proof of campaign attribution. Then implement independent persistence and
attribution before enabling the other platforms. Google/YouTube then TikTok is a
recommended sequence; the user has not selected their relative business priority.

The assessment's complete future-system estimates, not an estimate for the small
shared refactor, are:

| Phase | Hours |
| --- | --- |
| Access audit, provider selection and data design | 20–32 |
| Canonical event/financial lifecycle and delivery persistence | 40–64 |
| Flutter identity, consent and instrumentation | 40–64 |
| Attribution integration and identity linking | 40–64 |
| Meta adapter and end-to-end validation | 24–40 |
| Meta spend/reporting imports | 20–32 |
| Admin analytics views | 48–72 |
| Firebase, Google Ads and YouTube reporting | 32–56 |
| TikTok events and reporting | 32–56 |
| Reconciliation, privacy, monitoring and release hardening | 40–64 |
| Total | 396–644 |

Planning range with 20% contingency: about 475–775 hours. Meta-first analytics
pilot: approximately 250–390 hours. These assume a supported attribution provider,
one experienced engineer, and exclude access approvals/store-review waits. They
are not a fixed quote or an estimate for simply enabling the existing Meta code.

Potential costs: MMP measurement/export features, cloud storage/workers/logs,
optional warehouse queries, test devices/purchases/campaigns and maintenance.
Firebase Analytics is listed as no-cost; related cloud services can be billable.
Obtain current provider quotes and expected volume before committing to budget.

## References

- [Meta app measurement runbook](meta-app-measurement.md)
- [Mobile Meta setup](../../../frontend/docs/meta-measurement.md)
- [Meta app activities API](https://developers.facebook.com/docs/graph-api/reference/application/activities/)
- [TikTok App Events SDK](https://ads.tiktok.com/resources/help/article/about-the-tiktok-app-events-sdk?lang=en)
- [GA4 app event verification](https://developers.google.com/analytics/devguides/collection/protocol/ga4/verify-implementation)
- [Google App campaigns](https://support.google.com/google-ads/answer/6247380?hl=en)
- [Android Install Referrer](https://developer.android.com/google/play/installreferrer)
- [Apple ad attribution](https://developer.apple.com/app-store/ad-attribution/)
- [AppsFlyer pricing](https://www.appsflyer.com/pricing/)
- [Firebase pricing](https://firebase.google.com/pricing)
