# Deployment & Operations (Hostinger VPS)

Decided: one Hostinger VPS for everything (DECISIONS.md D7). Day-to-day procedures (restore, disputes, key rotation):
`RUNBOOK.md`. Config files live in `deploy/` in the repo.

## What to buy (nothing is bought yet)

Buy everything **in the foundation's name and with the foundation's email**, not the developer's (DECISIONS.md open-6).
Track each item in CONTENT.md §16.

| Item | Recommendation |
|---|---|
| Domain | `nooresadaqah.org` (check availability); DNS on **Cloudflare** (free) |
| VPS | Hostinger KVM 2 or bigger: **2 vCPU, 8 GB RAM, 100 GB NVMe**, Ubuntu 24.04 LTS, datacenter in Asia (Mumbai/Singapore). 4 GB is the bare minimum: Next.js builds, Postgres, Redis, Celery and WeasyPrint all share it. |
| Staging | Same VPS, separate users/DB/ports, at `staging.nooresadaqah.org` (password-protected). Move it to a small second VPS if load grows. |
| Cloudflare R2 | One account, buckets `noore-media` (public, custom domain `media.nooresadaqah.org`), `noore-private`, `noore-backups` |
| SMS gateway | Bangladeshi provider with a **BTRC-approved masked sender ID** (approval can take 1–2 weeks); Unicode (Bengali) SMS supported |
| Email sending | Resend (or SMTP from the mailbox provider) on the domain, with SPF/DKIM/DMARC |
| Mailbox | `info@`: Google Workspace for Nonprofits if the foundation qualifies, otherwise Zoho Mail or Hostinger email |
| Uptime & errors | Better Stack or UptimeRobot (free), Sentry (free tier) |

## Environments

| Env | URL | Gateways | Database |
|---|---|---|---|
| Local | http://localhost:3000 (Next) + :8000 (Django) | sandbox | local Postgres (Docker or native) |
| Staging | https://staging.nooresadaqah.org (basic auth, `noindex`) | sandbox | `noore_staging` |
| Production | https://nooresadaqah.org | **live** only after QA_CHECKLIST.md passes | `noore` |

- Gateway callback URLs must be public HTTPS. For local tests, use `cloudflared tunnel` and set `SITE_URL` to the tunnel URL (TESTING.md).
- Production and staging never share a database, Redis DB number, R2 bucket prefix or gateway keys.

## Server layout

```
/srv/noore/
├── app/                 # git checkout (frontend/ and backend/)
├── venv/                # Python virtualenv for backend
├── env/backend.env      # root:noore 0640 — production secrets
├── env/frontend.env
└── releases.log
Users: `noore` (runs the services, no sudo), `deploy` (SSH key login, can restart the services)
```

| Service (systemd unit in `deploy/systemd/`) | Command | Listens |
|---|---|---|
| `noore-web` | `node frontend/.next/standalone/frontend/server.js` (`output: "standalone"`), with `HOSTNAME=localhost PORT=3000` | localhost:3000 |
| `noore-api` | `gunicorn config.wsgi -w 3 --timeout 30` | 127.0.0.1:8000 |
| `noore-worker` | `celery -A config worker -l info --concurrency 2` | — |
| `noore-beat` | `celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler` | — (**exactly one** beat process) |
| `postgresql` | PostgreSQL 16 | 127.0.0.1:5432 |
| `redis-server` | Redis 7, `requirepass`, bound to localhost | 127.0.0.1:6379 |
| `nginx` | reverse proxy + TLS | :80, :443 |

All units: `Restart=always`, `User=noore`, `EnvironmentFile=/srv/noore/env/…`.

## Nginx (`deploy/nginx/nooresadaqah.conf`, sketch)

```nginx
server {
  listen 443 ssl http2;  server_name nooresadaqah.org;
  # certbot manages ssl_certificate lines
  client_max_body_size 10m;
  gzip on;
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-For $remote_addr;      # overwrite, never append (SECURITY.md)

  location /api/v1/payments/  { proxy_pass http://127.0.0.1:8000; }
  location /api/v1/receipts/  { proxy_pass http://127.0.0.1:8000; }
  location /r/                { proxy_pass http://127.0.0.1:8000; }   # short receipt links
  location = /api/v1/health/  { proxy_pass http://127.0.0.1:8000; }
  location /api/              { return 404; }        # everything else is internal (Next → Django)
  location /admin/            { proxy_pass http://127.0.0.1:8000; limit_req zone=admin burst=20; }
  location /dj-static/        { alias /srv/noore/app/backend/staticfiles/; expires 30d; }
  location /internal/         { return 404; }        # Next revalidate hook: localhost only
  location /                  { proxy_pass http://localhost:3000; }   # localhost, not 127.0.0.1: see below
}
server { listen 80; server_name nooresadaqah.org www.nooresadaqah.org; return 301 https://nooresadaqah.org$request_uri; }
```
**Run Next.js with `HOSTNAME=localhost`, never `127.0.0.1`.** Next normalises `127.0.0.1` to `localhost` in request
URLs; if the server itself is bound to `127.0.0.1`, the locale rewrite from `src/proxy.js` looks like a different
origin and Next tries to proxy it as an external URL, which ends in a redirect loop or a 500. Found while testing F0
(Next.js 16.4.5). On Ubuntu `localhost` resolves to `127.0.0.1`, so Nginx can still reach it. `deploy.sh` checks it.

`limit_req zone=admin` needs `limit_req_zone $binary_remote_addr zone=admin:10m rate=10r/s;` in the `http {}` block
(`/etc/nginx/conf.d/limits.conf`). With `output: "standalone"`, the build step must copy `.next/static` to
`.next/standalone/.next/static` and `public/` to `.next/standalone/public` (do it in `npm run build:standalone`).

If Cloudflare proxies the domain (orange cloud), use `set_real_ip_from` for Cloudflare ranges + `real_ip_header CF-Connecting-IP`
so `$remote_addr` is the visitor. Gateways must still reach the callback URLs: don't put WAF challenges on `/api/v1/payments/`.

## First-time server setup (checklist)

1. Ubuntu 24.04 updates; `unattended-upgrades` on; timezone `Asia/Dhaka`.
2. SSH: key login only, no root login, no passwords; `fail2ban`.
3. UFW: allow 22, 80, 443 only.
4. Install Node 22 LTS, Python 3.12, PostgreSQL 16, Redis 7, Nginx, certbot, and WeasyPrint system libs (`libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b`).
5. Create users, `/srv/noore`, Postgres role + DB with a strong password, Redis password.
6. Write `env/backend.env` and `env/frontend.env` from the `.env.example` files.
7. Install systemd units and the Nginx site; `certbot --nginx -d nooresadaqah.org -d www.nooresadaqah.org`.
8. First deploy (below), then `manage.py seed`.
9. Backups (below) and a **test restore**.
10. Uptime monitor and Sentry.

## Deploy (`deploy/deploy.sh`, run as `deploy`)

```bash
set -euo pipefail
cd /srv/noore/app && git fetch && git checkout --detach "${1:-origin/master}"
# backend
/srv/noore/venv/bin/pip install -r backend/requirements.lock
/srv/noore/venv/bin/python backend/manage.py migrate --noinput
/srv/noore/venv/bin/python backend/manage.py collectstatic --noinput
/srv/noore/venv/bin/python backend/manage.py check --deploy
# frontend
cd frontend && npm ci && npm run build:standalone && cd ..
sudo systemctl restart noore-api noore-worker noore-beat noore-web
curl -fsS -o /dev/null http://localhost:3000/bn && curl -fsS -o /dev/null http://localhost:3000/en   # both languages render (/ only redirects)
curl -fsSL --max-redirs 3 -o /dev/null http://localhost:3000/   # / redirects to /bn without a loop
curl -fsS https://nooresadaqah.org/api/v1/health/ && echo "$(date -Is) $(git rev-parse --short HEAD)" >> ../releases.log
```
- Migrations must be backward compatible with the running code for the few seconds of a restart (add columns first, remove them in a later release).
- After changing a `NEXT_PUBLIC_*` value, rebuild the frontend.
- Rollback: `deploy.sh <previous commit>` (only if no irreversible migration happened in between).
- Later: GitHub Actions runs tests, then SSHes in and runs `deploy.sh` for `master` (TESTING.md).

## Scheduled jobs (django-celery-beat, times Asia/Dhaka)

| Task | Schedule | What it does |
|---|---|---|
| `subscriptions.charge_subscriptions` | daily 10:00 | DONATION_FLOW.md "Monthly" |
| `donations.cleanup_pending` | daily 03:00 | Query the gateway once, then settle PENDING older than 24 hours |
| `core.nisab_reminder` | weekly, Sunday 10:00 | Email the admin if the nisab price is older than 30 days |
| `payments.reconcile_report` | weekly, Monday 09:00 | Email PAID totals per method for the past week, for comparison with the merchant panels |
| `core.backup_check` | daily 07:00 | Alert if last night's backup file is missing or tiny |

Every task is **safe to run twice** (locks or unique keys, see DATA_MODEL.md). Celery `task_acks_late=True`,
`worker_prefetch_multiplier=1`, retries with backoff for SMS/email.

## Database & backups

- Migrations: `makemigrations` locally and commit them; production only runs `migrate`. Never edit a migration that has been deployed.
- **Backups:** `deploy/backup.sh` via root crontab at 02:00: `pg_dump -Fc` → encrypt (`age` or `gpg`) → upload to R2
  `noore-backups/` with `rclone`. Keep 30 daily + 12 monthly. Also keep the last 3 on the VPS.
- **Test a restore before launch and every 3 months** (RUNBOOK.md). A backup that was never restored doesn't count.
- Media is already on R2; turn on R2 object versioning or a weekly copy of `noore-media` to the backup bucket.
- Donation, subscription, gateway-event and audit tables are never hard-deleted.

## Monitoring

- Uptime checks every 5 minutes on `/` and `/api/v1/health/` (checks DB and Redis), alerting the admin by email/SMS.
- Sentry in both apps; `send_default_pii=False` and a `before_send` that strips phone/email/token fields (SECURITY.md).
- Every gateway callback is stored as a `GatewayEvent` (no secrets) so disputes can be traced.
- Disk space alert at 80% (Better Stack agent or a small cron script).
- Logs: `journalctl -u noore-*`; keep 14 days (`SystemMaxUse=1G`).

## Domain & email DNS

- Cloudflare DNS: `A` for `@` and `staging` → VPS IP; `CNAME www → @`; R2 custom domain `media`.
- Email sending: SPF, DKIM (from Resend) and DMARC (`p=quarantine` after a week at `p=none`) so receipts don't land in spam.

## Pre-launch site (frontend only, `API_MODE=static`)

If a gateway wants to see a live site before the backend exists (ROADMAP "pre-launch site"):
1. Server setup steps 1–4 and 7 (Node + Nginx + certbot only; no Postgres, Redis or Django yet).
2. `frontend.env`: `API_MODE=static`, real content in the fixtures, reviewed policy pages, real contact details.
3. Run only `noore-web`. In the Nginx site keep `location /` and the security headers; `location /api/` returns 404 for now.
4. Later, adding Django means installing the other services and enabling the `/api/v1/…`, `/r/` and `/admin/` blocks;
   the `location /` block doesn't change. Then switch to `API_MODE=live` and rebuild.

## Launch day

1. QA_CHECKLIST.md fully passed on staging with sandbox keys.
2. Production env: `SSLCOMMERZ_SANDBOX=false`, `BKASH_SANDBOX=false`, live keys; restart services.
3. Set the live IPN/callback URLs in both merchant panels.
4. Make one real ৳10 donation with each method, check SMS, email and PDF receipt, then refund it from the merchant panel and mark it refunded in the admin.
5. Remove `noindex`; submit the sitemap in Google Search Console.
6. Watch Sentry and the dashboard closely for the first 48 hours.
