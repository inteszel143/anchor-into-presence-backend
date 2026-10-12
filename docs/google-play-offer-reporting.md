# Google Play offer reporting

The admin **Promotional offers → Google Play** report reads saved Android purchase
tokens through Google's `purchases.subscriptionsv2.get` API. It reports actual
subscription offers and signup promo codes, with production/test filtering,
search, status filters, period-end sorting, and refresh. It does not create,
activate, or change store offers, billing, or user entitlements.

## Server setup

1. Enable **Google Play Android Developer API** in the service account's Google
   Cloud project. The existing local Firebase account authenticated successfully,
   but its Play API check returned `403 SERVICE_DISABLED` during setup.
2. In Play Console → Users and permissions, invite the service account email and
   grant access to this app. Google's billing setup guide specifies **View financial
   data, orders, and cancellation survey responses** and **Manage orders and
   subscriptions**. This implementation only performs read requests to Play.
3. Set these server environment variables (paths are relative to the backend
   working directory unless absolute):

   ```dotenv
   GOOGLE_PLAY_PACKAGE_NAME=com.mediation.mindfullyevolve.mindfully_evolve_app
   GOOGLE_PLAY_SERVICE_ACCOUNT_PATH=src/lib/serviceAccountKey.json
   ```

   The existing ignored Firebase key file can be reused if its account is granted
   Play access. A dedicated service account is also supported: point the variable
   at its server-side JSON file. Do not commit private key files or use `NEXT_PUBLIC_`
   variables. The service account email currently present locally is
   `firebase-adminsdk-fbsvc@mindfull-yoga-project.iam.gserviceaccount.com`.
4. Deploy/restart the backend with the key file and environment available.
5. Release the updated Android app. It sends `platform` and `purchaseToken` when
   saving completed and restored purchases, including purchases made before signup.
   Older app versions remain compatible, but do not supply reporting tokens.
6. Complete or restore a test offer purchase, then select **Test purchases** in the
   Google admin report. Confirm product, offer/code, latest successful order,
   and subscription period against Play Console. Check Production separately.

## Coverage and interpretation

- This is the latest subscription snapshot for each saved token, not a complete
  historical redemption or renewal ledger. Duplicate saved tokens are checked once.
- Product, offer, code, environment, dates, and status come from Google's response,
  not from client-supplied offer identifiers. Purchase tokens are excluded from
  ordinary purchase-history queries and all admin responses.
- Pending purchases and deferred replacement items are excluded. A canceled
  subscription is not automatically marked expired or revoked.
- An offer associated with a subscription does not prove its discount is still
  running. Period end refers to subscription access, not a campaign expiration.
- Google does not reveal the text of a one-time promo code. Custom promo-code text
  is shown when Google returns it. An ordinary base plan is not counted as an offer.
- Old records with no tokens cannot be queried by their `GPA` order IDs. Restore
  Purchases may recover eligible existing purchases through the updated app.
  Untracked Android rows and unavailable/expired tokens are shown as coverage gaps.
- There is no separate Google sandbox endpoint; `testPurchase` in Google's response
  determines the environment. Coverage counts span both environments.
- The report fails explicitly on credentials, permissions, malformed responses,
  API errors, or more than 500 distinct tokens. It uses at most five concurrent
  Google lookups and a 45-second API deadline. A larger installation needs a
  persistent background sync / Real-time Developer Notifications integration.
- An empty token set does not prove that the Play API or app permissions work:
  authentication alone can succeed while the Play API is disabled. A real saved
  test purchase is required for the end-to-end access check.

## References

- [Google API setup and permissions](https://developers.google.com/android-publisher/getting_started)
- [Subscription purchase lookup](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2/get)
- [Subscription response fields](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2)

## Local checks

```sh
node --test tests/google-play-offers.test.cjs tests/app-store-offers.test.cjs tests/user-purchase-reload.test.cjs
npx tsc --noEmit --incremental false
```

From `frontend/`:

```sh
flutter test test/purchase_reporting_test.dart test/purchase_feedback_test.dart test/subscription_plan_card_test.dart
```
