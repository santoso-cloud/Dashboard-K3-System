#!/usr/bin/env bash
set -euo pipefail
# Gunakan PGHOST, PGPORT, PGUSER, PGDATABASE. Password diminta psql client.
: "${PGDATABASE:?Set PGDATABASE terlebih dahulu}"
[ "$#" -eq 1 ] || { echo 'Usage: bash backup-db.sh /folder/backup-di-luar-repo'; exit 1; }
command -v pg_dump >/dev/null
command -v pg_restore >/dev/null
umask 077
mkdir -p "$1"
output="$1/k3-$(date +%Y%m%d-%H%M%S)-$$.dump"
pg_dump -W -Fc --file="$output"
pg_restore --list "$output" >/dev/null
echo "Backup dibuat: $output"
echo 'Uji restore ke database baru sebelum melakukan migrasi database utama.'
