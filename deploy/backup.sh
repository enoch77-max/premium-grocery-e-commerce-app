#!/bin/sh
# Nightly encrypted Postgres dump with retention + optional offsite copy.
set -eu
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
DIR="${BACKUP_DIR:-/var/backups/fresco}"
KEEP="${BACKUP_RETENTION_DAYS:-14}"
FILE="$DIR/fresco-$STAMP.sql.gz.gpg"
mkdir -p "$DIR"

pg_dump --no-owner --no-privileges -h postgres -U fresco -d fresco \
  | gzip -9 \
  | gpg --batch --yes --symmetric --cipher-algo AES256 \
        --passphrase "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE required}" \
        -o "$FILE"

# Verify the dump is readable before trusting it
gpg --batch --quiet --decrypt --passphrase "$BACKUP_PASSPHRASE" "$FILE" | gunzip -t

# Retention
find "$DIR" -name 'fresco-*.sql.gz.gpg' -type f -mtime +"$KEEP" -delete

if [ -n "${RCLONE_REMOTE:-}" ]; then
  rclone copy "$FILE" "${RCLONE_REMOTE}:${RCLONE_PATH:-fresco-backups}" || echo "offsite copy failed" >&2
fi

echo "backup ok: $FILE ($(wc -c < "$FILE") bytes)"
