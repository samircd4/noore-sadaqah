#!/bin/sh
# Nightly backup on the VPS (root crontab):  0 2 * * * sh /srv/noore/app/deploy/backup.sh >> /var/log/noore-backup.log 2>&1
# Database dump + uploaded files, kept in deploy/backups/ for 14 days. If rclone has a remote called "r2" configured,
# the files are copied to the noore-backups bucket as well (DEPLOYMENT.md "Database & backups").
# A backup that was never restored doesn't count: test a restore (RUNBOOK.md).
set -eu

cd "$(dirname "$0")/.."
COMPOSE="docker compose -f compose.prod.yaml --env-file deploy/.env"
STAMP="$(date +%Y-%m-%d_%H%M)"
DIR=deploy/backups
mkdir -p "$DIR"
chmod 700 "$DIR"

# Custom-format dump (pg_restore can restore single tables from it).
$COMPOSE exec -T db sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$DIR/db_$STAMP.dump"
# Uploaded photos and PDFs (skipped when uploads are on R2: the volume is then empty).
$COMPOSE exec -T web tar -czf - -C /app/backend media > "$DIR/media_$STAMP.tar.gz"

[ -s "$DIR/db_$STAMP.dump" ] || { echo "$(date -Is) backup FAILED: empty dump" >&2; exit 1; }

if command -v rclone > /dev/null && rclone listremotes | grep -q '^r2:'; then
    rclone copy "$DIR" r2:noore-backups/ --include "*_$STAMP.*"
fi

find "$DIR" -type f -mtime +14 -delete
echo "$(date -Is) backup ok: $STAMP"
