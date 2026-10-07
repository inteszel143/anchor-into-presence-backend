#!/usr/bin/env bash
# Run on the AWS host as ubuntu. Builds separately; keeps prior releases.
set -Eeuo pipefail
umask 077
export PATH="/home/ubuntu/.nvm/versions/node/v22.23.2/bin:$PATH"
archive=${1:?Provide the release archive}
commit=${2:?Provide the full commit SHA}
[[ "$commit" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid commit'; exit 1; }
pm2_cwd=/var/www/html/meditation-main
deploy_root=/var/www/meditation-deploy
live="$deploy_root/current"
releases="$deploy_root/releases"
control="$HOME/meditation-deploy"
mkdir -p "$control"
exec 9>"$control/deploy.lock"
flock -n 9 || { echo 'Another deployment is running'; exit 1; }
test -w "$deploy_root" || { echo 'Run the one-time release layout setup first'; exit 1; }
test -L "$live"
test -L "$pm2_cwd"
[[ "$(readlink "$pm2_cwd")" == "$live" ]] || { echo 'Unexpected application symlink'; exit 1; }
test -d "$live/.next"
test -f "$live/src/lib/serviceAccountKey.json"
command -v pm2 >/dev/null
pm2 describe meditation >/dev/null
pm2 jlist | node -e '
  let input = "";
  process.stdin.on("data", chunk => input += chunk);
  process.stdin.on("end", () => {
    const app = JSON.parse(input).find(app => app.name === "meditation");
    if (!app || app.pm2_env.pm_cwd !== process.argv[1]) {
      console.error("Unexpected PM2 working directory; stop and inspect before deployment.");
      process.exit(1);
    }
  });
' "$pm2_cwd"
mkdir -p "$releases"
release=$(mktemp -d "$releases/${commit:0:12}.XXXXXXXX")
tar -xzf "$archive" -C "$release" --no-same-owner
test -f "$release/package-lock.json"

# The initial server is Next 15; the repository currently requests Next 16.
# A tested major upgrade must be explicitly recorded by the server operator.
live_major=$(node -p "require('$live/node_modules/next/package.json').version.split('.')[0]")
target_major=$(node -p "require('$release/package-lock.json').packages['node_modules/next'].version.split('.')[0]")
approved_major=$(cat "$control/approved-next-major" 2>/dev/null || true)
if [[ "$target_major" != "$live_major" && "$approved_major" != "$target_major" ]]; then
  echo "Stopped before deployment: Next.js $live_major -> $target_major requires a separately tested upgrade."
  exit 1
fi

# Preserve server-only configuration. Never upload these files to GitHub.
for name in .env .env.local .env.production .env.production.local; do
  if [[ -f "$live/$name" ]]; then
    cp -p "$live/$name" "$release/$name"
    chmod 600 "$release/$name"
  fi
done
cp -p "$live/src/lib/serviceAccountKey.json" "$release/src/lib/serviceAccountKey.json"
chmod 600 "$release/src/lib/serviceAccountKey.json"

cd "$release"
npm ci --include=dev
node --test tests/*.test.cjs
if (( target_major >= 16 )); then
  npm run build -- --webpack
else
  npm run build
fi
test -s .next/BUILD_ID
printf '%s\n' "$commit" > DEPLOYED_COMMIT

# No second app is started for the build: startup would restore production crons.
previous=$(readlink -f "$live")
switched=false
rollback() {
  trap - ERR HUP INT TERM
  if [[ "$switched" == true ]]; then
    echo 'Deployment failed; restoring previous release.'
    if [[ -L "$live" ]]; then rm "$live"; fi
    ln -s "$previous" "$live"
  fi
  pm2 restart meditation || echo 'ROLLBACK RESTART FAILED: inspect PM2 immediately.'
  exit 1
}
trap rollback ERR HUP INT TERM
# Keep uploads outside new Git releases; retain old releases until storage migrates.
for path in uploads public/uploads; do
  if [[ -d "$previous/$path" ]]; then
    if [[ -e "$release/$path" ]]; then
      mv "$release/$path" "$release/${path//\//-}-from-git"
    fi
    mkdir -p "$(dirname "$release/$path")"
    ln -s "$(readlink -f "$previous/$path")" "$release/$path"
  fi
done
# Create the replacement before stopping the app. os.replace atomically replaces
# the current symlink without needing write access to /var/www/html.
ln -s "$release" "$deploy_root/next-release-$$"
pm2 stop meditation
switched=true
python3 -c 'import os, sys; os.replace(sys.argv[1], sys.argv[2])' \
  "$deploy_root/next-release-$$" "$live"
pm2 restart meditation

healthy=false
for attempt in {1..30}; do
  status=$(curl --silent --show-error --max-time 5 \
    -o "$control/health-response.json" -w '%{http_code}' \
    http://127.0.0.1:3022/api/auth/socialLogin \
    -H 'Content-Type: application/json' --data '{}' || true)
  if [[ "$status" == 400 ]] && node -e '
    const fs = require("fs");
    const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    if (body.message !== "All fields (login_medium, email, social_id) are required!") process.exit(1);
  ' "$control/health-response.json" 2>/dev/null; then
    healthy=true
    break
  fi
  sleep 2
done
[[ "$healthy" == true ]] || { echo 'Health check failed'; false; }
printf '%s\n' "$previous" > "$control/previous-release"
printf '%s\n' "$release" > "$control/current-release"
trap - ERR HUP INT TERM
echo "Deployed $commit. Previous release retained at $previous"
