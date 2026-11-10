# Complimentary yearly redemption fallback

The mobile branch formerly showing "waiting for subscription confirmation" now
calls POST /api/users/purchase/redemption-fallback, then refreshes the profile.
It grants 365 days to the authenticated app account without an Apple transaction.
This is an explicit business exception: sheet dismissal does not prove redemption,
and any signed-in account can call this endpoint. Blocked, deleted, and signed-out
accounts cannot claim. It is not restricted to Tina or a verified offer code.

The server atomically sets redemptionYearlyGrantedAt and redemptionYearlyExpiresAt
on the user only once. Retries do not extend access, including after expiry.
The profile reports active access while this grant is valid, including after an
app restart or later store transaction. No Apple receipt, payment, renewal, or
purchase history row is fabricated. Admin purchase reporting remains store based.

Deploy the backend endpoint, user model, and profile changes before releasing the
mobile build. Until then, the mobile fallback reports activation failure and does
not unlock access locally. A successful request followed by a failed profile read
can safely be retried. The app requires sign-in and checks for account switches.

This does not transfer existing Apple purchases between app accounts or resolve
store ownership conflicts. Store delivery errors retain their existing handling.
No production deployment or account modification is performed by these changes.
