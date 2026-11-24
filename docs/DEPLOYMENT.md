# Deployment & Operations (Hostinger VPS)

Decided: one Hostinger VPS for everything (DECISIONS.md D7), run with Docker Compose (D19). Day-to-day procedures
(restore, disputes, key rotation): `RUNBOOK.md`. Config files live in `deploy/` in the repo.

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

## Server layout (Docker Compose, DECISIONS.md D19)

The VPS runs the whole site with Docker Compose from one git checkout: `compose.prod.yaml` at the repo root.
All settings are in **one file, `deploy/.env`** (copy `deploy/.env.example`; `chmod 600`; never committed).

```
/srv/noore/app/            # git checkout (owner: deploy)
├── compose.prod.yaml
├── deploy/.env            # production secrets (chmod 600)
├── deploy/Caddyfile       # HTTPS + routing
├── deploy/deploy.sh       # build + start, in the right order
├── deploy/backup.sh       # nightly database + uploads backup
└── deploy/backups/        # last 14 days of backups (not in git)
```

| Service | Image | What it does | Reachable from |
|---|---|---|---|
| `caddy` | `caddy:2-alpine` | HTTPS (Let's Encrypt, renews itself), routing, serves `/media/` | internet: 80, 443 |
| `frontend` | `frontend/Dockerfile` | Next.js standalone server | Docker network |
| `web` | `backend/Dockerfile` | Django (gunicorn); runs `migrate` on every start | Docker network, and 127.0.0.1:8000 on the VPS (for the frontend build) |
| `worker` | same image | Celery worker: receipts, cache refreshes | — |
| `beat` | same image | django-celery-beat scheduler (**exactly one**) | — |
| `db` | `postgres:16-alpine` | PostgreSQL, volume `pgdata` | Docker network only |
| `redis` | `redis:7-alpine` | Celery broker + cache, password, volume `redisdata` | Docker network only |

Volumes (kept across deploys): `pgdata`, `redisdata`, `media` (uploads), `caddy_data` (certificates).
Every service has `restart: unless-stopped`, so the site comes back after a reboot. Logs rotate (5 × 20 MB each).

## Routing (`deploy/Caddyfile`)

| Path | Goes to |
|---|---|
| `/api/v1/payments/*`, `/api/v1/receipts/*`, `/api/v1/health/`, `/r/*` | Django (gateway callbacks, receipts, uptime check) |
| `/admin/*`, `/dj-static/*`, `/api/docs/`, `/api/schema/` | Django (admin and its files; API docs are staff only) |
| `/media/*` | files from the `media` volume (Caddy) |
| other `/api/*`, `/internal/*` | **404**: internal only (Next.js calls Django and Django calls the revalidate hook over the Docker network) |
| everything else | Next.js |
| `www.<domain>` | redirect to `<domain>` |

Caddy has a fixed address on the Docker network (`172.30.0.10`, `TRUSTED_PROXY_IPS`), so Django believes the visitor
IP it forwards; Next.js proves the IPs it forwards with `API_PROXY_SECRET` (API.md "Client IP").
If Cloudflare proxies the domain (orange cloud), keep the gateways' callback paths free of WAF challenges.

## First-time server setup (Hostinger VPS)

1. Hostinger panel: VPS with **Ubuntu 24.04** (or the "Ubuntu 24.04 with Docker" template), datacenter in Asia.
2. As root: updates, `unattended-upgrades`, `timedatectl set-timezone Asia/Dhaka`.
3. SSH: create user `deploy` with your SSH key; key login only, no root login, no passwords; `fail2ban`.
4. Firewall (UFW, and the Hostinger panel firewall if it's on): allow **22, 80, 443** only.
5. Docker Engine + Compose plugin (skip if the template has them): `curl -fsSL https://get.docker.com | sh`, then
   `usermod -aG docker deploy`.
6. DNS: `A` record for the domain (and `www`) → the VPS IP. Wait until it resolves: Caddy needs it for the certificate.
7. As `deploy`: `git clone <repo> /srv/noore/app`, then `cp deploy/.env.example deploy/.env`, fill it in,
   `chmod 600 deploy/.env`. For the first deploy set `SEED_ON_START=true` and `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
8. `sh deploy/deploy.sh`. Then set `SEED_ON_START=false` again.
9. Backups: root crontab `0 2 * * * sh /srv/noore/app/deploy/backup.sh >> /var/log/noore-backup.log 2>&1`, plus
   `rclone config` with a remote named `r2` for off-site copies. **Test a restore.**
10. Uptime monitor and Sentry.

## VPS that already runs Nginx (`PROXY=nginx`)

If another site on the VPS already uses Nginx on ports 80/443, don't stop it. Nginx keeps those ports and forwards
this site's domain to Caddy on `127.0.0.1:8080`; Caddy only does the routing (`deploy/Caddyfile.behind-nginx`,
`deploy/compose.behind-nginx.yaml`). The other sites are not touched.

1. `deploy/.env`: `PROXY=nginx`. `deploy.sh` and `backup.sh` then add the override file themselves.
2. Nginx site for this domain only (a subdomain such as `noore-sadakah.example.com` works the same way):
   ```bash
   sed "s/DOMAIN/<your domain>/g" deploy/nginx-site.conf > /etc/nginx/sites-available/noore-sadaqah
   ln -s /etc/nginx/sites-available/noore-sadaqah /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   certbot --nginx -d <your domain>      # HTTPS for this domain; certbot renews it with the others
   ```
3. `sh deploy/deploy.sh`.

`nginx-site.conf` overwrites `X-Forwarded-For` with the visitor's address, and Caddy trusts it from the private
network, so Django still sees the real visitor IP for rate limits.

## Deploy (`deploy/deploy.sh`, run as `deploy`)

```bash
sh deploy/deploy.sh                 # deploys origin/master
sh deploy/deploy.sh <commit or tag> # a specific version (also the rollback)
```

It fetches the code, builds the backend image, starts Postgres, Redis, Django, worker and beat (Django runs its
migrations on start), waits for `/api/v1/health/`, runs `check --deploy`, **then** builds the frontend (its build
reads Django's live content through 127.0.0.1:8000) and starts everything, checks `/bn`, `/en` and the health URL over
HTTPS, and logs the release in `deploy/releases.log`.

Everyday commands (from `/srv/noore/app`):

```bash
C="docker compose -f compose.prod.yaml --env-file deploy/.env"
$C ps                                   # what is running
$C logs -f web worker                   # logs
$C exec web python manage.py createsuperuser
$C exec web python manage.py seed       # reload the fixtures (overwrites edited content!)
$C restart worker beat
```

- Migrations must be backward compatible with the running code for the few seconds of a restart (add columns first,
  remove them in a later release).
- After changing a `NEXT_PUBLIC_*` value or the domain, run `deploy.sh` again (the frontend is rebuilt).
- Rollback: `deploy.sh <previous commit>` (only if no irreversible migration happened in between).
- Later: GitHub Actions runs the tests, then SSHes in and runs `deploy.sh` for `master` (TESTING.md).

## Scheduled jobs (django-celery-beat, times Asia/Dhaka)

| Task | Schedule | What it does |
|---|---|---|
| `subscriptions.charge_subscriptions` | daily 10:00 | DONATION_FLOW.md "Monthly" |
| `payments.cleanup_pending` | daily 03:00 | Query the gateway once, then settle PENDING older than 24 hours |
| `core.nisab_reminder` | weekly, Sunday 10:00 | Email the admin if the nisab price is older than 30 days |
| `payments.reconcile_report` | weekly, Monday 09:00 | Email PAID totals per method for the past week, for comparison with the merchant panels |
| `core.backup_check` | daily 07:00 | Alert if last night's backup file is missing or tiny |

Every task is **safe to run twice** (locks or unique keys, see DATA_MODEL.md). Celery `task_acks_late=True`,
`worker_prefetch_multiplier=1`, retries with backoff for SMS/email.

## Database & backups

- Migrations: `makemigrations` locally and commit them; production only runs `migrate`. Never edit a migration that has been deployed.
- **Backups:** `deploy/backup.sh` via root crontab at 02:00: `pg_dump -Fc` of the database and a tar of the uploads
  into `deploy/backups/` (14 days), copied to R2 `noore-backups/` with `rclone` when a remote named `r2` exists.
  Later: encrypt before upload (`age`), keep 30 daily + 12 monthly in R2.
- **Test a restore before launch and every 3 months** (RUNBOOK.md). A backup that was never restored doesn't count.
- Uploads live in the `media` volume (backed up by `backup.sh`), or on R2 when `MEDIA_STORAGE=s3`; then turn on R2
  object versioning.
- Donation, subscription, gateway-event and audit tables are never hard-deleted.

## Monitoring

- Uptime checks every 5 minutes on `/` and `/api/v1/health/` (checks DB and Redis), alerting the admin by email/SMS.
- Sentry in both apps; `send_default_pii=False` and a `before_send` that strips phone/email/token fields (SECURITY.md).
- Every gateway callback is stored as a `GatewayEvent` (no secrets) so disputes can be traced.
- Disk space alert at 80% (Better Stack agent or a small cron script).
- Logs: `docker compose -f compose.prod.yaml --env-file deploy/.env logs <service>`; each service keeps 5 × 20 MB.

## Domain & email DNS

- Cloudflare DNS: `A` for `@` and `staging` → VPS IP; `CNAME www → @`; R2 custom domain `media`.
- Email sending: SPF, DKIM (from Resend) and DMARC (`p=quarantine` after a week at `p=none`) so receipts don't land in spam.

## Pre-launch site (frontend only, `API_MODE=static`)

If a gateway wants to see a live site before the backend is ready (ROADMAP "pre-launch site"): build the frontend
image without `BUILD_API_URL` (it then builds from the fixtures, read only) and run it with `API_MODE=static` behind
Caddy. Real content in the fixtures, reviewed policy pages, real contact details. Switching to the full site later is
just `deploy.sh` with the complete `compose.prod.yaml`.

## SnapDeploy (container hosting, alternative to the VPS)

SnapDeploy builds each app from a Dockerfile, gives it `PORT`, and injects `DATABASE_URL` / `REDIS_URL` from its
add-ons. The repo has two apps, so create **two SnapDeploy apps from the same GitHub repo**. That's why the
"No Build Files at Root" message appears: each app needs its **Root Directory** set (Advanced Options).

| | Backend app | Frontend app |
|---|---|---|
| Root Directory | `backend/` | `frontend/` |
| Dockerfile | `backend/Dockerfile` (gunicorn + Celery worker + beat, `start.sh`) | `frontend/Dockerfile` (Next standalone) |
| Add-ons | PostgreSQL, Redis | — |
| Build variables | — | `NEXT_PUBLIC_DJANGO_ORIGIN` = backend app's https address; `NEXT_PUBLIC_SITE_URL`; `NEXT_PUBLIC_MEDIA_HOST` |
| Run variables | `DJANGO_DEBUG=false`, `DJANGO_SECRET_KEY`, `RECEIPT_TOKEN_SECRET`, `DJANGO_ALLOWED_HOSTS` (backend host), `DJANGO_CSRF_TRUSTED_ORIGINS` (`https://<site>`), `SITE_URL` (`https://<site>`), SSLCommerz, email, `FRONTEND_INTERNAL_URL` (`https://<site>`), `REVALIDATE_SECRET`, `API_PROXY_SECRET`, `MEDIA_STORAGE=s3` + `MEDIA_*`, `SEED_ON_START=true` (first deploy) | `API_MODE=live`, `API_INTERNAL_URL` (`<backend>/api/v1`), `REVALIDATE_SECRET`, `API_PROXY_SECRET` |

Order: deploy the **backend first** (with its add-ons), then the frontend: its build reads Django's content.
Without `NEXT_PUBLIC_DJANGO_ORIGIN` the frontend builds as the read-only pre-launch site from the fixtures.

Visitors, the admin (`/admin/`) and SSLCommerz callbacks all use the **frontend's** address; Next.js forwards
`/api/`, `/admin/`, `/r/` and `/media/` to the backend (next.config.mjs), standing in for Nginx.

Before real donations on SnapDeploy:
- **Uploads need R2** (`MEDIA_STORAGE=s3`): SnapDeploy has no lasting disk, so files saved in the container are lost
  at the next deploy.
- **Always-on plan**: the free tier sleeps after 15 idle minutes (the Celery worker and the receipt emails sleep too)
  and has 512 MB, tight for gunicorn + Celery + WeasyPrint. Custom domains need a paid tier.
- The Celery worker shares the web container: if it crashes it isn't restarted until the next deploy. Watch the logs.
- `/internal/revalidate` is reachable on the public address here (no Nginx to block it); it relies on
  `REVALIDATE_SECRET` alone, so make it long and random.
- Images run on ARM64; both Dockerfiles use multi-arch base images.

## Launch day

1. QA_CHECKLIST.md fully passed on staging with sandbox keys.
2. Production env (`deploy/.env`): `SSLCOMMERZ_SANDBOX=false`, `BKASH_SANDBOX=false`, live keys; run `deploy.sh`.
3. Set the live IPN/callback URLs in both merchant panels.
4. Make one real ৳10 donation with each method, check SMS, email and PDF receipt, then refund it from the merchant panel and mark it refunded in the admin.
5. Remove `noindex`; submit the sitemap in Google Search Console.
6. Watch Sentry and the dashboard closely for the first 48 hours.
