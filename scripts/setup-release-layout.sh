#!/usr/bin/env bash
# One-time, supervised AWS setup; does not install code or update dependencies.
set -Eeuo pipefail
umask 077
export PATH="/home/ubuntu/.nvm/versions/node/v22.23.2/bin:$PATH"
live=/var/www/html/meditation-main
root=/var/www/meditation-deploy
[[ "$(id -un)" == ubuntu ]] || { echo 'Run as ubuntu'; exit 1; }
test -d "$live/.next"
test ! -L "$live" || { echo 'Application is already a symlink; inspect before proceeding'; exit 1; }
test ! -e "$root/current"
pm2 describe meditation >/dev/null
sudo -v
# Only these new, application-specific directories get ubuntu ownership.
sudo install -d -o ubuntu -g ubuntu -m 755 "$root" "$root/releases"
previous="$root/releases/legacy-$(date +%Y%m%d-%H%M%S)-$$"
moved=false
rollback() {
  trap - ERR HUP INT TERM
  if [[ "$moved" == true ]]; then
    if [[ -L "$live" ]]; then sudo rm "$live"; fi
    sudo mv "$previous" "$live"
    if [[ -L "$root/current" ]]; then rm "$root/current"; fi
  fi
  pm2 restart meditation || echo 'Restart failed; inspect PM2 immediately.'
  exit 1
}
trap rollback ERR HUP INT TERM
pm2 stop meditation
sudo mv "$live" "$previous"
moved=true
ln -s "$previous" "$root/current"
sudo ln -s "$root/current" "$live"
pm2 restart meditation
trap - ERR HUP INT TERM
echo 'Release layout prepared. Existing code and dependencies retained.'
echo 'Verify the public endpoint and Google/Apple login before enabling deployments.'
