# Community image upload hotfix — November 13, 2026 (Asia/Manila)

Live release: `13e319c73d3a7c2430824d259b8c7aa4719fac5a`.
Local branch: `release/community-upload-20261113` (not pushed).

Production logged `Response body object should not be disturbed or locked` before the community POST handler ran. Next 15.5.20 Node middleware invokes its asynchronous body-clone finalizer without awaiting it. When authentication completes before a multipart upload ends, the route adapter can receive the original, already-read stream.

Authenticated multipart requests now drain the middleware's body clone without retaining chunks before continuing. Next retains a separate clone for the route parser. Authentication failures still return immediately. No app changes are needed.

Verification:
- A regression test reproduced the exact production exception before the fix and passed afterward, checking complete image bytes and multipart fields through Next's body clone and route adapter.
- 158 backend tests passed locally and on the server; TypeScript and production build checks passed.
- Restart health check passed.
- A deliberately slow authenticated 512 KB multipart image request and a public HTTPS request both reached the existing image-count validator, returning the expected 400 rather than 500. Two files were supplied deliberately so validation stopped before S3 upload or post creation.
- Unauthenticated posting still returned 401.
- No public test posts or S3 objects were created. A complete real post/save was not performed by verification.

Current: `/var/www/meditation-deploy/releases/13e319c73d3a.AAGNXvM4`.
Rollback: `/var/www/meditation-deploy/releases/ee8237a59ddc.P89JJdz9`.
Log: `/home/ubuntu/meditation-deploy/community-upload-20261113.log`.
Verifier/staging: `/dev/shm/anchor-community-20261113` (temporary).
Archive SHA-256: `adc7232901ed445da85bb5033c4c765682bf67e1cc98d3df0773b4d99d45fc71`.

Production dependencies were unchanged. Disk has approximately 99 MB free; additional capacity is needed before another deployment. Previous releases and uploads were retained.
