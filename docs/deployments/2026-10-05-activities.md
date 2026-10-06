# Activities release — October 5, 2026 (Asia/Manila)

Deployed commit `c7b6859b3f5cbf781af291053ba82c671cf2cdab` from branch
`codex/activities-live-release-20261005`, pushed to the existing GitHub repository.

This release applies Activities commit `653439b` to the verified production
baseline `0ead3bd`, retaining its package files and Next.js 15.5.20. It includes
Daily Pause image uploads/previews, legacy media preservation, schedule editing,
concurrent video/thumbnail storage uploads, upload progress, and server timings.
Older admin regression mocks were updated for the new category/media lookups.

Verification: 40 server-side tests passed; production build and type/lint checks
passed; local social-login validation health check passed; public admin login
returned HTTP 200; unauthenticated Activities API returned HTTP 401. The live
DEPLOYED_COMMIT matches the release. Authenticated upload speed was not measured.

Current release: `/var/www/meditation-deploy/releases/c7b6859b3f5c.asvW2N4R`.
Previous release retained: `/var/www/meditation-deploy/releases/0ead3bdc49b8.SeXpDLza`.
Deployment uses the existing `scripts/deploy-aws.sh` and PM2 `meditation` process.
Production secrets and existing upload links were retained by that script.

The Flutter home-page text removal is not part of this backend deployment.
