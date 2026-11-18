# Community badge and Library duration — deployed November 14, 2026

Live release: `772034e1e73e3bdaac786348eeafdef0980e8e2c`.
Source: `d01691a217aee96d187c7987f94e8a88a6171859`.
Local release branch: `release/community-badge-20261114` (not pushed).
Production package.json and package-lock.json match the prior live release exactly;
Next.js remains 15.5.20.

Includes Community new-post count and visit acknowledgement APIs, a feed timestamp
boundary, and duration in the Library activities API.

Validation:
- 162 backend/admin tests passed locally and on the production host.
- Four deployment-script tests passed locally.
- Production compilation, lint/type validation, and page generation passed.
- PM2 restart and the existing social-login validation smoke check passed.
- Public HTTPS admin login and app-version returned 200.
- Community activity, posts, and Library activities rejected unauthenticated requests with 401.
- Release identity, exact dependency checksums, and retained upload target verified.
- No designated unblocked test account was found. Authenticated count/visit and
  duration response verification remains unperformed. Automatic approval review
  rejected using an arbitrary customer account; that verifier was not executed.
- No customer records were changed and no notifications were sent by verification.

Authorized cleanup removed only node_modules and .next from five old October
release folders: 0ead3bdc49b8.SeXpDLza, 302fc96b48f1.BoTG273v,
7017831b886a.HjEqpyjP, c7b6859b3f5c.asvW2N4R, d359cb9ae5c1.cOT8F3jT.
Their source/configuration and uploads were preserved; those five old releases
would need rebuilding before reuse. Current and recent rollback builds remained
intact. Cleanup recovered about 4.7 GB; approximately 3.3 GB remained after deployment.

Current: `/var/www/meditation-deploy/releases/772034e1e73e.pihOiBcx`.
Rollback: `/var/www/meditation-deploy/releases/13e319c73d3a.AAGNXvM4`.
Earlier rollback retained: `/var/www/meditation-deploy/releases/ee8237a59ddc.P89JJdz9`.
Uploads: `/var/www/meditation-deploy/releases/legacy-before-admin-20261003/public/uploads`.
Log: `/home/ubuntu/meditation-deploy/community-badge-20261114.log`.
Archive SHA-256: `f9b4305095a3dd435c1fb5a564070c098e827f8d790503510d4eeea591f12b12`.

The mobile app was not built or released by this deployment.
