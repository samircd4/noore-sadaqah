# Runbook: operations

Step-by-step procedures for whoever looks after the live site. Server layout and services: `DEPLOYMENT.md`.
Write down every incident (date, what happened, what was done) at the end of this file.

Useful commands (on the VPS, as `deploy`, in `/srv/noore/app`):
```bash
C="docker compose -f compose.prod.yaml --env-file deploy/.env"
$C ps                                   # every service and its state
$C logs --tail 200 web                  # Django errors
$C logs --tail 200 worker               # SMS/email/charges
$C exec web python manage.py shell
```

## 1. "I paid but didn't get a receipt" / disputed payment

1. Ask for: date, amount, method, phone number, and the gateway transaction ID (bKash trxID or the SMS from the bank).
2. Admin → Donations → search by phone, gateway_txn_id or gateway_ref.
3. Found, **PAID**: "রসিদ আবার পাঠান". Check the Outbound messages list for SMS errors.
4. Found, **PENDING**: "গেটওয়েতে যাচাই করুন". If the gateway says paid, it becomes PAID and the receipt goes out.
5. Found, **FAILED/CANCELLED** but the donor shows proof: check the GatewayEvents list and the merchant panel. If the
   panel shows a settled payment for that ref, use "গেটওয়েতে যাচাই করুন". If it was CANCELLED, an Admin decides:
   refund it in the merchant panel, or enter it as an offline donation with the gateway reference (note why).
6. Not found at all: search the merchant panel by trxID. If the payment is ours but has no donation, enter it as an
   offline donation with method and reference, and report it as a bug.

## 2. Weekly reconciliation (every Monday)

1. Open the weekly reconciliation email (PAID totals per method for last week).
2. Compare with the SSLCommerz and bKash settlement reports for the same dates (Asia/Dhaka).
3. Differences: list the transactions on each side; resolve each with §1. Record the result in the finance sheet.

## 3. Amount/currency mismatch or "cancelled but paid" alert

Don't change anything in the database by hand. Open the GatewayEvent, compare with the merchant panel, then follow §1.5.
A mismatch with no clear reason may be tampering: keep the event, tell the Admin, and refund through the panel if needed.

## 4. Site is down

1. `curl -I https://nooresadaqah.org/` and `/api/v1/health/`.
2. `$C ps` for all services; restart the failed one: `$C restart web` (or `$C up -d` to start anything stopped).
3. Health says `db` or `redis` down: `$C logs db redis`; check disk space `df -h` and `docker system df`.
4. After a bad deploy: `deploy.sh <previous commit from releases.log>`.
5. Payments made while the site was down: the gateways retry IPNs; afterwards check PENDING donations from that period (§1.4).

## 5. Restore a backup (test every 3 months)

Backups are `deploy/backups/db_<date>.dump` (and in R2 `noore-backups/` when rclone is set up). Test restore:
```bash
DUMP=deploy/backups/db_YYYY-MM-DD_0200.dump
$C exec -T db sh -c 'createdb -U "$POSTGRES_USER" noore_restore_test'
$C exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d noore_restore_test --no-owner' < "$DUMP"
$C exec -T db sh -c 'psql -U "$POSTGRES_USER" noore_restore_test -c "select count(*), max(paid_at) from donations_donation;"'
$C exec -T db sh -c 'dropdb -U "$POSTGRES_USER" noore_restore_test'
```
For a real restore: `$C stop web worker beat frontend`, take a dump of the broken state, restore into the real
database (`pg_restore --clean --if-exists -d "$POSTGRES_DB"`), `$C up -d`, then check PENDING donations since the
backup time with the gateways (§1.4). Uploads: `tar -xzf media_<date>.tar.gz` into the `media` volume
(`$C exec -T web tar -xzf - -C /app/backend < media_<date>.tar.gz`).
The backup decryption key is kept in the foundation's password manager **and** offline (printed, in the office safe).

## 6. Rotate a secret

| Secret | Steps | Side effects |
|---|---|---|
| `JWT_SIGNING_KEY` | Change in `deploy/.env`, run `deploy.sh` | All donors are logged out |
| `DJANGO_SECRET_KEY` | Change, restart | Staff sessions end, password-reset links break |
| `RECEIPT_TOKEN_SECRET` | Change, restart | Old SMS receipt links stop working (donors can still use `/account`) |
| `REVALIDATE_SECRET`, `API_PROXY_SECRET` | Change in `deploy/.env` (both apps read it), run `deploy.sh` | none |
| `FIELD_ENCRYPTION_KEY` | Add the new key first (MultiFernet: new, old), run `manage.py rotate_tokens`, then remove the old key | none if done in this order |
| Gateway keys | Generate new ones in the merchant panel, update env, restart api + worker, make a ৳10 test | Short window of failed payments: do it at night |
| DB / Redis password | Change in Postgres/Redis and env, restart everything | Brief downtime |

Rotate everything at once if a developer with server access leaves, or if a secret may have leaked.

## 7. A Celery task failed

- SMS/email: they retry on their own. After the final failure, the OutboundMessage shows `failed` with the error;
  use "রসিদ আবার পাঠান" once the cause (SMS balance, provider down) is fixed. **Check SMS balance monthly.**
- `charge_subscriptions` didn't run: it is safe to run again: `manage.py shell -c "from apps.subscriptions.tasks import charge_subscriptions; charge_subscriptions()"`.
- Beat not running: `$C ps beat` and `$C logs beat`. There must be exactly one.

## 8. Switch from sandbox to live (launch, or a new gateway)

Follow DEPLOYMENT.md "Launch day". After switching, keep the sandbox keys only in staging.

## 9. Turn on zakat / fitra (after sign-off)

1. Check ZAKAT_POLICY.md sign-off table is complete and the approved texts are in the admin.
2. Enter the nisab prices (with source and date) and, before Ramadan, the fitra rates and cutoff.
3. Admin → Settings → `zakat_enabled = true`. Check the calculator against the signed example cases (QA §8).

## 10. Staff member leaves

Set `is_active = False` on their account, remove their 2FA device, review the audit log for their last actions,
and rotate any shared secret they had (§6).

---

## Incident log

| Date | What happened | What we did | Follow-up |
|---|---|---|---|
| | | | |
