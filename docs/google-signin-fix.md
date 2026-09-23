# Deploy the optional push-token fix

The live `/api/auth/socialLogin` endpoint was checked with an empty JSON request.
It still returned HTTP 400 with `fcmToken` listed as a required field. The local
`src/app/api/auth/socialLogin/route.ts` removes this requirement. Push registration
can be unavailable even after Google and Firebase authentication have succeeded.

1. Transfer the updated route to the backend checkout on the production server.
2. In that checkout, run `npm run build` and verify it succeeds.
3. Restart the existing backend service using its actual process-manager name.
   The README uses PM2 name `meditation-app`; confirm with `pm2 list` before
   running `pm2 restart meditation-app --update-env`.
4. Verify the deployed validation with a request that cannot create an account:

   ```sh
   curl --silent --show-error --max-time 20 \
     https://admin.anchorintopresence.net/api/auth/socialLogin \
     -H 'Content-Type: application/json' --data '{}'
   ```

   HTTP 400 is expected for this empty request. The message should list only
   `login_medium, email, social_id` as required, without `fcmToken`.
5. Retry Google login from the app. A missing push token should no longer reject
   login. Other errors, such as an account using a different provider, remain
   explicit rejections and should be investigated separately.

Local regression checks (mocked database; no production writes):

```sh
node --test tests/social-login.test.cjs
```

No production deployment was performed from this workspace.
