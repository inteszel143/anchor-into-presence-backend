# Apple subscriber report

`/admin/offers` now opens an Apple Subscribers view. Promotional offers remain
available in a separate view; Google Play reporting is unchanged. The navigation
label is Subscriptions & offers.

The authenticated, uncached `/api/admin/subscribers?environment=production` route
uses saved iOS transaction IDs (and numeric legacy IDs without a platform) to call
Apple's Get All Subscription Statuses API. It includes regular subscriptions,
introductory offers/trials, promotional offers, offer codes, and win-back offers.
It does not depend on notification delivery. No entitlements or records are changed.

Totals count unique app accounts with confirmed subscription chains. Renewals
are deduplicated by original transaction ID, keeping the latest signed snapshot.
Active includes statuses 1 and 4 (active and billing grace period); disabling
auto-renew does not immediately make a subscriber inactive. Account associations
are app-recorded, not verified ownership. Chains associated with multiple accounts
are flagged and those accounts excluded from totals. Deleted accounts retain a
row with unavailable identity details. Lifetime and complimentary access are not
Apple auto-renewable subscriptions.

Missing IDs and failed checks remain visible as needing review. They do not count
as inactive. Production and sandbox are separate; a purchase found only in the
other environment currently appears as an unavailable check. The report cannot
recover purchases never delivered to the app server. A purchase restore can supply
missing records; complete ongoing coverage requires a verified store notification
receiver and durable subscription ledger. Do not describe these totals as the
entire App Store subscriber population.

Requests use four concurrent Apple checks and a shared 45-second deadline. After
the deadline, remaining records are flagged unavailable. More than 2,000 saved
purchase records produces an explicit background-sync requirement rather than
silently truncating totals. Refresh requests a new snapshot.

Validation: `node --test tests/*.test.cjs`, `npx tsc --noEmit --incremental false`.
Live Apple connectivity and deployment must be checked separately; mocked tests
are not evidence that production credentials or networking work.
