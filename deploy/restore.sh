#!/bin/sh
# Restore an encrypted dump into a database. Usage:
#   ./restore.sh /var/backups/fresco/fresco-20260101T030000Z.sql.gz.gpg
set -eu
FILE="${1:?path to .sql.gz.gpg dump required}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE required}"
echo "Restoring $FILE"
gpg --batch --quiet --decrypt --passphrase "$BACKUP_PASSPHRASE" "$FILE" \
  | gunzip \
  | psql "${DATABASE_URL:?DATABASE_URL required}" -v ON_ERROR_STOP=1
echo "restore complete"
