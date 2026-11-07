# Redeem-code access recovery

This change fixes mobile transaction delivery and UI synchronization. It does not
configure offers in App Store Connect / Play Console or replace the existing
purchase-date-based entitlement calculation with store verification.

## Release order

1. Deploy/restart the backend first. The purchase model adds a partial unique
   `deliveryKey` index for new/reconciled transactions. Existing purchase rows are
   preserved. Confirm that the index exists in the deployed database.
2. Release the mobile build. One eagerly created SubscriptionBloc listens for
   transactions throughout the app session. A missing product catalog no longer
   discards purchases. Failed delivery remains unfinished for store replay, and
   retries every 15 seconds while the app is running under the same session.
3. Previously affected users can use **Restore purchases** while signed into
   their original app and store accounts. Successful purchase and restore both
   refresh the backend profile and exit the subscription prompt when active.

## Device acceptance checks

- Redeem ANCHORVIP and ANCHORAMBASSADOR on eligible iOS sandbox accounts; verify
  access, account association, and app restart. Confirm the actual first-year
  price/duration and renewal settings in App Store Connect.
- Delay product loading and redeem externally; the purchase must still save.
- Interrupt the purchase API response, reconnect, and confirm recovery without
  another charge or duplicate purchase row. Repeat after killing the app.
- Restore an active purchase; confirm the paywall closes. Restore an expired
  purchase; confirm it does not grant access from a local success flag.
- Switch app accounts during a failed delivery; it must not grant access to the
  new account. An already associated transaction returns HTTP 409.
- On Android, complete each matching offer through Google Play and verify the
  same delivery, retry, and restore behavior.

## Remaining subscription platform work

Server-side store verification, verified transaction ownership, offer redemption
ledgers/eligibility, Apple server notifications, Google RTDN, and actual store
expiry/renewal reconciliation remain necessary. The new idempotency key prevents
repeated transaction inserts; it is not proof of payment or a once-per-offer rule.
Catalog prices remain reporting estimates, not authoritative offer charges.
