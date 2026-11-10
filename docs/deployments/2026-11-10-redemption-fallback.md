# Redemption fallback deployment — November 10, 2026 (Asia/Manila)

Live commit: `794cd9271443fbf9eb529b687b89405e3432d030`.
Source commit: `1a1c8ca` (redemption fallback changes).
Local release branch: `release/redemption-fallback-20261110`; not pushed.
Production package.json and package-lock.json retained from the previous release;
Next.js remains 15.5.20. The working dev branch was not switched.

Included application changes: authenticated complimentary yearly grant endpoint,
user grant dates, and profile entitlement handling. Regular purchase route unchanged.
No mobile build was deployed. The updated iPhone app must be released to invoke
this fallback. This endpoint grants once per app account without proof of an
Apple redemption, as explicitly requested; see ../redemption-yearly-fallback.md.

Validation:
- 115 backend tests passed locally and on the production server.
- Four deployment-script tests passed locally.
- Production build, lint/type checks, and generation of 72 pages passed.
- Deployment health check passed after restart.
- Release identity, compiled fallback route, and dependency lockfile verified.
- Both origin and public .com admin login/app-version endpoints returned 200.
- Both origin and public .com fallback POST, regular purchase POST, and profile
  GET rejected unauthenticated requests with 401.
- No authenticated grant request was made and no customer records were modified
  by verification. A real iPhone redemption was not tested.

Disk was 99% full. The deployment used a reviewed copy of scripts/deploy-aws.sh
that first compares both package files byte for byte against the live release,
then hard-links the identical installed node_modules instead of running npm ci.
No package files were upgraded or installed. A dedicated /dev/shm build-cache
folder was removed after build success. Other deployment checks, atomic release
switch, automatic rollback, environment preservation, and upload links were retained.
Previous releases were not deleted. Approximately 397 MB remains free; capacity
should be increased before future deployments requiring new dependencies.

Current release: `/var/www/meditation-deploy/releases/794cd9271443.kS6ekKTz`.
Rollback release: `/var/www/meditation-deploy/releases/be16170bed99.beTtBVQi`.
Server artifacts/log: `/home/ubuntu/meditation-deploy/redemption-20261110/`.
Uploaded archive SHA-256:
`13ae3cbde5b3d9c31c38254a4555bba4b1ab8799fa4b840dee81b23c87b12288`.
Production package-lock SHA-256:
`0f13bce25ebaa77b7142ee5bff9488322c93658c0d10973acf2d10ba598a6199`.
