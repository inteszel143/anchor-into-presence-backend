# Automatic GitHub deployments to AWS

Status: prepared locally, not activated. The existing server remains managed by
PM2 as `meditation`, with cwd `/var/www/html/meditation-main` and port 3022.

## What runs

`.github/workflows/deploy.yml` runs isolated backend tests on pull requests and
pushes to `main`. Deployment runs after successful tests on `main` only when the
repository Actions variable `ENABLE_PRODUCTION_DEPLOY` equals `true`. A manual
workflow dispatch from main is also supported. Production deployments are
serialized and an active deployment is not cancelled by a newer push.

GitHub sends an archive of the exact tested commit through SSH. It does not run
`git pull` in the old server folder or require a GitHub token on AWS.

The server script creates a release, installs its own locked dependencies with
`npm ci`, runs tests, and builds before stopping PM2. It copies the existing
production environment files and Firebase service account locally; they are
never sent to GitHub. A supervised, one-time `scripts/setup-release-layout.sh` moves the existing
application into `/var/www/meditation-deploy/releases/legacy-*`. The original
application path becomes a root-owned symlink to `/var/www/meditation-deploy/current`.
Only the new deployment directory is owned by ubuntu; `/var/www/html` stays
root-owned. PM2 keeps its original cwd and npm start configuration. Automatic
deployments subsequently replace the ubuntu-owned `current` symlink. Existing uploads are linked to their retained location.

The post-restart check sends an empty social-login request and expects the known
400 validation response without fcmToken. This is a smoke check, not an actual
Google/Apple login or a complete database/profile test. Test both providers after
the first deployment. Build failure leaves the live app untouched; restart or
health failure attempts to restore the previous release and restart PM2. Failed
rollback still needs operator attention. Releases are not automatically deleted:
uploads may still refer to retained releases.

## Resolve the production baseline first

Production currently uses Next.js 15, while this repository uses Next.js 16 and
other updated dependencies. Do not enable deployment as an incidental framework
upgrade. Obtain production `package.json` and `package-lock.json` (neither should
contain credentials), compare them, then either align and test the repository
against that baseline or separately validate the upgrade.

The script rejects a Next.js major mismatch before changing the live app. After
an explicitly tested major upgrade, the operator can record its approved major
in `~/meditation-deploy/approved-next-major`. Never set that file merely to bypass
a failed deployment. Matching major versions are not a guarantee of compatible
dependencies; review lockfile changes before merging.

## One-time connection setup

1. Re-authenticate GitHub CLI on the developer Mac if needed with
   `gh auth login --hostname github.com --web`. Never paste its token into chat.
2. Confirm the EC2 public hostname, SSH connectivity from the chosen GitHub
   runner, available disk space, PM2 cwd, and Node 22.23.2. Do not broadly open
   SSH to the internet just for hosted runner connectivity; use an approved
   network route or a runner with a known permitted source address.
3. Create a dedicated deployment SSH key on the operator's Mac, leaving existing
   keys untouched. Install only its public key into ubuntu's authorized_keys,
   with `restrict` to disable forwarding and PTY allocation. Keep the private
   key out of the repository, logs, and chat.
4. Verify the server's SSH host public key using the trusted AWS browser terminal
   (`cat /etc/ssh/ssh_host_ed25519_key.pub`). Create the matching known_hosts entry
   using the exact public host used for deployment. Do not disable host checks or
   trust an unverified network key scan.
5. Review `scripts/setup-release-layout.sh` and run it once in a supervised AWS
   browser terminal as ubuntu. It uses sudo only for the dedicated new directory
   and the original app path; do not change ownership of `/var/www/html`. This
   step briefly stops/restarts the current service without upgrading its code.
   Check the public endpoint afterward. Confirm nginx proxies to port 3022
   rather than reading release files directly. Verify `.env*` and Firebase JSON
   exist on the server. Do not enable Actions before this setup is verified.
6. In GitHub repository Settings > Environments, create `production` and restrict
   it to main. Configure these environment secrets:

   | Secret | Value |
   | --- | --- |
   | `DEPLOY_HOST` | EC2 public IP or DNS hostname; SSH port 22 |
   | `DEPLOY_USER` | `ubuntu` |
   | `DEPLOY_SSH_KEY` | Dedicated private deployment key |
   | `DEPLOY_KNOWN_HOSTS` | Verified host entry: `HOST ssh-ed25519 PUBLIC_KEY` |

7. Commit and push the workflow, script, tests, and docs. Leave the repository
   variable `ENABLE_PRODUCTION_DEPLOY` unset initially so only tests run. Ensure
   direct pushes and merges into main are limited to trusted maintainers; changes
   to deployment scripts execute with the application's server permissions.
8. Once connection, baseline, permissions, and CI checks are verified, set the
   repository Actions variable `ENABLE_PRODUCTION_DEPLOY=true`. Dispatch the
   workflow on main for the first supervised release. Subsequent main pushes
   deploy automatically. Unset the variable to disable future deployments.

No server or GitHub configuration is changed by merely adding these local files.

## Operator recovery

The workflow log reports the previous release path. After a successful release,
`~/meditation-deploy/previous-release` also contains it. Retain the original PM2
configuration, Node installation, server secrets, and old releases. For a manual
rollback, verify that recorded folder exists and is the intended release, stop
`meditation`, replace `/var/www/meditation-deploy/current`'s symlink with one pointing
to that folder, then restart `meditation` and verify the public endpoint. Do not
delete a real directory when a symlink was expected.

References:
- https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments
- https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments
- https://pm2.keymetrics.io/docs/usage/application-declaration/

## Confirmed host details

- Host: `34.194.71.95`; SSH user: `ubuntu`.
- Verified public host-key entry supplied through the AWS browser terminal:

  ```text
  34.194.71.95 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPLCbQm/x6Kz9k+0AVo04hwDBectDuTiTWTNsVgq0Ssl
  ```

This is public host identity information, not a private deployment credential.
Still needed: SSH inbound source rule, exact installed Next.js version, production
dependency baseline, dedicated client key setup, and first supervised deployment.
