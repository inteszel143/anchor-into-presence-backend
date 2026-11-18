# Schedule dates — deployed November 18, 2026

Source commit: `87afb8ce4a6963a512efc1b98a141f73af91b7a3`.
Live release: `20c2f5fd544cc2b2f93997547fcdf634074f4f12`.
Release source is retained at `/private/tmp/anchor-schedule-release-20261118`.
The release uses the prior production package.json and package-lock.json exactly;
Next.js remains 15.5.20. Only the Home, activities, and recent activities API
projections change application behavior, exposing the existing scheduleDate field.

Validation:
- 162 backend/admin tests passed locally and on the server.
- Four deployment-script tests passed locally.
- Production build, lint/type checking, and page generation passed.
- PM2 restart and social-login validation health check passed.
- Public HTTPS admin login and app-version returned 200.
- Home, activities, and recent activities rejected unauthenticated requests with 401.
- Deployed source fields, release identity, dependency checksums, and retained upload path verified.
- Authenticated schedule-date responses were not checked: no test-account session was available.

Current: `/var/www/meditation-deploy/releases/20c2f5fd544c.tp7s2kvs`.
Rollback: `/var/www/meditation-deploy/releases/772034e1e73e.pihOiBcx`.
Uploads: `/var/www/meditation-deploy/releases/legacy-before-admin-20261003/public/uploads`.
Log: `/home/ubuntu/meditation-deploy/schedule-20261118.log`.
Server free disk after deployment: approximately 2.1 GB.

No mobile app build or store release was performed.
