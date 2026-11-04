# Runbook: operations

Step-by-step procedures for whoever looks after the live site. Server layout and services: `DEPLOYMENT.md`.
Write down every incident (date, what happened, what was done) at the end of this file.

Useful commands (on the VPS, as `deploy`):
```bash
sudo systemctl status noore-web noore-api noore-worker noore-beat
journalctl -u noore-api -n 200 --no-pager          # Django errors
journalctl -u noore-worker -n 200 --no-pager       # SMS/email/charges
cd /srv/noore/app/backend && sudo -u noore /srv/noore/venv/bin/python manage.py shell
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
2. `systemctl status` for all services; restart the failed one: `sudo systemctl restart noore-api`.
3. Health says `db` or `redis` down: `systemctl status postgresql redis-server`; check disk space `df -h`.
4. After a bad deploy: `deploy.sh <previous commit from releases.log>`.
5. Payments made while the site was down: the gateways retry IPNs; afterwards check PENDING donations from that period (§1.4).

## 5. Restore a backup (test every 3 months)

```bash
rclone copy r2:noore-backups/daily/noore-YYYY-MM-DD.dump.age /tmp/
age -d -i /root/backup-key.txt /tmp/noore-YYYY-MM-DD.dump.age > /tmp/noore.dump
sudo -u postgres createdb noore_restore_test
sudo -u postgres pg_restore -d noore_restore_test --no-owner /tmp/noore.dump
sudo -u postgres psql noore_restore_test -c "select count(*), max(paid_at) from donations_donation;"
sudo -u postgres dropdb noore_restore_test && shred -u /tmp/noore.dump
```
For a real restore: stop `noore-api noore-worker noore-beat`, restore into `noore` (after taking a dump of the broken
state), start the services, then check PENDING donations since the backup time with the gateways (§1.4).
The backup decryption key is kept in the foundation's password manager **and** offline (printed, in the office safe).

## 6. Rotate a secret

| Secret | Steps | Side effects |
|---|---|---|
| `JWT_SIGNING_KEY` | Change in `backend.env`, restart `noore-api` | All donors are logged out |
| `DJANGO_SECRET_KEY` | Change, restart | Staff sessions end, password-reset links break |
| `RECEIPT_TOKEN_SECRET` | Change, restart | Old SMS receipt links stop working (donors can still use `/account`) |
| `REVALIDATE_SECRET` | Change in **both** env files, restart `noore-api` and `noore-web` | none |
| `FIELD_ENCRYPTION_KEY` | Add the new key first (MultiFernet: new, old), run `manage.py rotate_tokens`, then remove the old key | none if done in this order |
| Gateway keys | Generate new ones in the merchant panel, update env, restart api + worker, make a ৳10 test | Short window of failed payments: do it at night |
| DB / Redis password | Change in Postgres/Redis and env, restart everything | Brief downtime |

Rotate everything at once if a developer with server access leaves, or if a secret may have leaked.

## 7. A Celery task failed

- SMS/email: they retry on their own. After the final failure, the OutboundMessage shows `failed` with the error;
  use "রসিদ আবার পাঠান" once the cause (SMS balance, provider down) is fixed. **Check SMS balance monthly.**
- `charge_subscriptions` didn't run: it is safe to run again: `manage.py shell -c "from apps.subscriptions.tasks import charge_subscriptions; charge_subscriptions()"`.
- Beat not running: `systemctl status noore-beat`. There must be exactly one.

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
