# Testing

What to test, with which tool, and when. The manual checklist is `QA_CHECKLIST.md`; items marked 🤖 there must have an automated test.

## Layers

| Layer | Tool | Lives in | Covers |
|---|---|---|---|
| Backend unit + API | **pytest-django**, `factory_boy`, `responses` (mock HTTP), `time_machine` | `backend/tests/` | Models, serializers, `mark_paid()`, receipt numbers, callbacks, throttles, permissions, Celery tasks (eager mode) |
| Backend concurrency | pytest with real Postgres + threads | `backend/tests/test_concurrency.py` | 20 parallel `mark_paid()` calls → 20 unique, gap-free receipt numbers; double IPN; two workers charging subscriptions |
| Frontend unit | **Vitest** | `frontend/src/**/*.test.js` | `format.js` (Bengali digits, taka, dates, `shortNumber`), `toLatinDigits`, Zod schemas, API error mapping |
| Mock API | **Vitest** | `frontend/src/mocks/*.test.js` | Handlers return the API.md shapes, error codes, pagination and 404s |
| End-to-end | **Playwright** | `e2e/` (root) | Main flows in four projects (viewports 320, 375, 768, 1440; `isMobile` + `hasTouch` for the phone ones): against `API_MODE=mock` from F3, against Django + mocked gateways from B2 |
| Contract | pytest | `backend/tests/test_contract.py` | Every Django response has the same keys and types as its fixture in `frontend/src/mocks/fixtures/` (added in each B phase) |
| Manual | QA_CHECKLIST.md | | Look, sandbox payments, PDFs, emails, SMS, Excel |
| Accessibility & speed | Lighthouse, axe (Playwright `@axe-core/playwright`) | | QA §11 |

Rules:
- **Every payment code change comes with tests.** Gateway HTTP calls are always mocked in unit tests (`responses`); never call the sandbox from CI.
- Tests use Postgres, not SQLite (we rely on `ArrayField`, `select_for_update`, `ON CONFLICT`).
- Celery: `CELERY_TASK_ALWAYS_EAGER=True` in unit tests; one integration test with a real worker before launch.
- No real SMS or email in tests: `SMS_PROVIDER=console`, `EMAIL_PROVIDER=console`; assert on `OutboundMessage` rows.

## Must-have backend tests (minimum)

- `mark_paid`: PENDING → PAID once; second call no-op; FAILED → PAID allowed; CANCELLED → PAID raises and alerts.
- SSLCommerz IPN: valid; invalid `val_id`; amount mismatch; currency mismatch; unknown `tran_id`; repeated IPN; IPN after browser success.
- bKash: success; cancel; failure; Execute timeout → Query decides; repeated callback.
- Receipt number format, year rollover (Dec 31 23:59 Dhaka vs Jan 1), parallel uniqueness.
- `add_month` with anchor days 28–31 across February and leap years.
- `charge_subscriptions`: AUTO success, AUTO failure ×3 → FAILED, REMINDER cycle, double run.
- Zakat lock: changing a donation's fund raises, even for a superuser.
- Permissions: for each group, each ModelAdmin view/add/change and each custom action → allowed or 403 as in ADMIN.md.
- OTP: expiry, attempts, throttles, staff refused, enumeration-safe responses, donation linking.
- JWT: rotation, blacklist, reuse rejected.
- `amount_in_words_bn` table test.
- Receipt PDF renders and `pdftotext` output contains the expected Bengali strings.

## Must-have e2e flows (Playwright)

1. Home → quick-donate → checkout → (mock gateway success) → success page shows PAID.
2. Donate form with Bengali digits in mobile and amount → accepted.
3. Failed payment → failed page → "আবার চেষ্টা করুন" pre-filled.
4. Login with OTP (code read from the console SMS provider in test mode) → `/account` lists the donation → receipt downloads.
5. Monthly → login round-trip → subscription created → pause → resume → cancel.
6. Every public page at **320** and 375 px: no horizontal scroll, no console errors, axe has no serious violations, sticky donate bar shown/hidden per RESPONSIVE.md §9, header fits.
7. `/en` versions of the home and donate pages show no Bengali UI labels.

Before the backend exists, e2e runs with `API_MODE=mock`: the fake gateway page is `/donate/mock-gateway` and the OTP
is `123456`. The same Playwright specs later run against Django.

Mock gateway for e2e in live mode: a test-only Django view (`apps/payments/testing.py`, only with `DEBUG` + `E2E=1`) that imitates
the gateway page and posts a valid-looking callback, while the Validation API is mocked on the server.

## Sandbox testing (manual, phase B2 and before launch)

1. Start a tunnel: `cloudflared tunnel --url http://localhost:8080` (local Nginx, or point the tunnel at Next and Django with two hostnames).
2. Set `SITE_URL` to the tunnel URL in `backend/.env` and restart Django and the worker.
3. SSLCommerz sandbox panel: set the IPN URL to `<tunnel>/api/v1/payments/sslcommerz/ipn/`.
4. Run QA_CHECKLIST.md §4–6 with the test cards and wallets from the SSLCommerz and bKash developer docs.
5. Check `GatewayEvent` rows in the admin for every case.

## CI (`.github/workflows/ci.yml`)

Workflow: `.github/workflows/ci.yml`. On every push to `master` and every pull request:
- **backend:** Python 3.12, Postgres 16 and Redis services → `ruff check`, `ruff format --check`, `python manage.py makemigrations --check --dry-run`, `pytest`, `pip-audit`.
- **frontend:** Node 22 → `npm ci`, `npm run lint`, `npm run i18n:check`, `npm run test` (Vitest), `npm run build`, `npm audit --audit-level=high`, palette grep (QA §1).
- **e2e:** from F3, Playwright against the standalone server (`HOSTNAME=localhost`, see DEPLOYMENT.md) with `API_MODE=mock` (no backend) on every push; from B2, also against both apps and the CI database on `master` and release branches.

Deploy only from a green `master` (DEPLOYMENT.md).
