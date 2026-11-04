# Security

A donation site handles money and personal data, and charities are a common fraud target (card testing, fake
receipts, phishing). These rules apply to both apps. Tests for them: QA_CHECKLIST.md §9–10.

## 1. Network exposure

- Only Nginx is reachable from the internet (ports 80/443; SSH on 22, key only). Next.js, Gunicorn, Postgres and Redis listen on `127.0.0.1`.
- Public Django paths are only: `/api/v1/payments/`, `/api/v1/receipts/`, `/r/`, `/api/v1/health/`, `/admin/`, `/dj-static/`.
  Every other `/api/` path returns 404 from outside; the Next.js server calls Django directly on localhost (ARCHITECTURE.md).
- `/internal/` (Next revalidate hook) is blocked by Nginx and also checks `X-Revalidate-Secret` (constant-time compare).

## 2. Donor authentication (JWT in httpOnly cookies)

| Setting | Value |
|---|---|
| Access token lifetime | 15 minutes |
| Refresh token lifetime | 30 days, **rotated** on every refresh; old one blacklisted (`rest_framework_simplejwt.token_blacklist`) |
| Signing key | `JWT_SIGNING_KEY` (not `DJANGO_SECRET_KEY`), HS256 |
| Cookies (set by Next.js) | `ns_access` and `ns_refresh`: `HttpOnly; Secure; SameSite=Lax; Path=/`; refresh `Max-Age` 30 days |
| Where tokens are read | Only in server code: `src/lib/session.js`, server actions, route handlers, `src/proxy.js` |

- `src/proxy.js`: if `ns_access` is missing or expired and `ns_refresh` exists, call `/auth/token/refresh/`, set the new
  cookies on the response, continue. If refresh fails, delete both cookies; `/account/*` redirects to `/login?next=`.
- Two refreshes at once (two tabs) can both use the same refresh token. Allow a short grace window: if the refresh is
  rejected as blacklisted within 30 seconds of a successful rotation, retry once with the cookie value the other request set.
- Logout: blacklist the refresh token and delete both cookies.
- Tokens never go into URLs, `localStorage`, logs, Sentry or client components.

### OTP rules

- 6 digits from `secrets.randbelow`, stored as a hash (`make_password`), valid 5 minutes, 5 attempts, single use.
- Throttles: 1 per 60 seconds and 5 per hour per target, 20 per hour per IP (API.md). Verify: 10 per 10 minutes per IP.
- Same response whether or not the phone/email has an account (no enumeration).
- OTP login refuses `is_staff` users.
- SMS text includes the site name and "কাউকে এই কোড বলবেন না" (NOTIFICATIONS.md).
- Watch for SMS pumping: alert if more than 200 OTP SMS go out in an hour (`OutboundMessage` count). Allow only Bangladeshi numbers (`01[3-9]XXXXXXXX`).

## 3. Staff authentication (Django admin)

- Session login, Argon2 password hashing, minimum 12 characters.
- TOTP second factor (`django-otp`) required for Admin and Accountant groups before launch.
- Lockout: 15 minutes after 5 failed attempts (`django-axes`).
- Nginx rate limit on `/admin/`. Optional: change the admin path with `ADMIN_URL` env, or restrict it to known IPs.
- `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SESSION_COOKIE_HTTPONLY`, session age 8 hours.

## 4. CSRF and request forgery

- Next.js server actions check that `Origin` matches the host (built in). Keep `serverActions.allowedOrigins` unset or set to our domain only.
- DRF endpoints used by Next.js authenticate with a Bearer header, so they are not open to cross-site form posts.
- Gateway callback views are `csrf_exempt` because the gateway posts them; they trust **nothing** until the
  server-to-server validation succeeds.
- Django admin keeps Django's CSRF protection; `CSRF_TRUSTED_ORIGINS = ["https://nooresadaqah.org"]`.

## 5. Client IP and throttling

- Nginx: `proxy_set_header X-Forwarded-For $remote_addr;` (overwrite, so visitors can't spoof it).
- Next.js forwards the incoming `X-Forwarded-For` unchanged to Django.
- Django reads the client IP from `X-Forwarded-For` **only when `REMOTE_ADDR` is `127.0.0.1`** (custom
  `get_client_ip` used by throttles and logs), else uses `REMOTE_ADDR`.
- Throttle storage: Redis cache (shared by all Gunicorn workers).

## 6. Payment integrity

- PAID only through `mark_paid()` after validation (DONATION_FLOW.md). The amount and fund are always taken from our database, never from the callback.
- Card testing defence: throttle `POST /donations/` per IP; alert if more than 20 FAILED SSLCommerz donations from one IP in an hour; consider Cloudflare Turnstile on the donate form if abuse appears.
- Gateway secrets only in `backend.env`. bKash grant token cached in Redis, never logged.
- `gateway_token` (bKash agreement / card token) encrypted at rest (`FIELD_ENCRYPTION_KEY`).
- `GatewayEvent.payload` is stored after removing `store_passwd`, tokens, and card fields.
- Receipt links are signed (short HMAC link, valid 90 days after payment, API.md). Wrong or expired → 404. The PDF shows the donor's name, so links are never posted publicly.

## 7. Personal data (PII)

PII here = donor name, phone, email, on-behalf-of name, IP.
- Never in logs, Sentry, analytics events, URLs or error messages. Sentry: `send_default_pii=False` and a `before_send`
  that removes keys matching `phone|email|name|otp|code|token|password|authorization|cookie`.
- Public pages show at most first name + amount; "anonymous" shows "নাম প্রকাশে অনিচ্ছুক". Never phone or email.
- Editors see masked phones (`017******78`) and no emails.
- Data export and deletion requests follow POLICIES.md §1.8 (handled by an Admin; donation records the law requires are kept).
- Backups are encrypted before leaving the server.

## 8. HTTP headers

Set in `next.config.mjs` `headers()` and Django `SecurityMiddleware` + `django-csp`:

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (add `preload` after launch is stable) |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Content-Security-Policy` (frontend) | `default-src 'self'; img-src 'self' data: https://media.nooresadaqah.org https://i.ytimg.com; frame-src https://www.youtube-nocookie.com https://www.google.com; script-src 'self' 'nonce-…' (+ GA/Meta only after consent); connect-src 'self' (+ analytics); form-action 'self' https://*.sslcommerz.com https://*.bka.sh; frame-ancestors 'none'` |
| CSP (admin) | Unfold's needs; `frame-ancestors 'none'` |

Gateway redirects are top-level navigations, so they don't need `frame-src`. Check the exact gateway hostnames in sandbox and live, and update `form-action`.

## 9. Content and uploads

- Markdown bodies are rendered and **sanitized on the server** (`nh3` or `bleach` allow-list); the frontend renders `body_html` with `dangerouslySetInnerHTML` only for these fields.
- Uploads: check type by content (Pillow opens it), not by extension; max 5 MB; re-encode images (strips EXIF GPS data); random file names.
- R2: the public bucket holds only public images and public reports. Anything private (none in v1) goes in the private bucket with signed URLs.

## 10. Secrets and dependencies

- `.env` files are never committed; `.gitignore` covers `.env*` except `.env.example`.
- Production secrets live only in `/srv/noore/env/*.env` (mode 0640) and the foundation's password manager.
- Generate secrets with `openssl rand -base64 48`; Fernet key with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.
- Rotation procedure: RUNBOOK.md.
- `npm audit`, `pip-audit` in CI; Dependabot on.
- `DEBUG=False` in production; `manage.py check --deploy` clean.
