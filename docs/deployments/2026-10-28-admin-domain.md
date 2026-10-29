# Admin .com domain — October 28, 2026 (Asia/Manila)

Added `admin.anchorintopresence.com` to the existing AWS host `34.194.71.95` after confirming its GoDaddy authoritative A record. The `.net` hostname remains active because released mobile clients use it for API requests.

- Added `/etc/nginx/sites-available/meditation-com` and its sites-enabled symlink, preserving the existing proxy to port 3022, uploads alias, and upload limit.
- Backed up the original site configuration to `/var/backups/nginx-admin-domain-20261028-114956/meditation`.
- Issued and installed a separate Let's Encrypt certificate using Certbot's Nginx integration. Initial expiry: January 26, 2027; automatic renewal configured by Certbot.
- Enabled HTTP-to-HTTPS redirects for the new hostname.
- No application release, database, mobile API URL, or existing .net certificate changes.

Rollback: remove only the `meditation-com` sites-enabled symlink, validate with `nginx -t`, and reload Nginx. The original .net virtual host remains in place.

Validation: Nginx configuration passed; both domains returned HTTP 200 for `/admin/login` with valid TLS, and HTTP requests redirected to HTTPS (301). An external request from the operator Mac using normal DNS also returned 200 with valid TLS for .com. The server's recursive DNS cache still held a negative response during verification; authoritative GoDaddy and Cloudflare DNS already returned the correct A record. Authenticated sign-in was not exercised.
