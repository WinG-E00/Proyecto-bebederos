#!/usr/bin/env bash
# Copia diaria de MySQL con retención. Uso (cron, 03:00):
#   0 3 * * * BACKUP_DIR=/var/backups/bebederos /ruta/database/scripts/backup.sh >> /var/log/bebederos/backup.log 2>&1
# Restauración ensayada (sobre una base vacía distinta, nunca sobre la operativa):
#   RESTORE_FILE=/var/backups/bebederos/bebederos-AAAAmmdd-HHMMSS.sql.gz RESTORE_DB=bebederos_restore scripts/backup.sh restore
# Credenciales: archivo de opciones MySQL (MYSQL_DEFAULTS_FILE, permisos 600) con [client] user/password/host/port.
# Nunca pasar la contraseña por argumento ni guardarla en el repositorio.
set -euo pipefail

: "${MYSQL_DEFAULTS_FILE:?Definir MYSQL_DEFAULTS_FILE con las credenciales [client] (chmod 600)}"
: "${DB_NAME:?Definir DB_NAME}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/bebederos}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
MYSQLDUMP="${MYSQLDUMP:-mysqldump}"
MYSQL="${MYSQL:-mysql}"
log() { printf '{"time":"%s","process":"backup","event":"%s"%s}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" "${2:+,$2}"; }

backup() {
  mkdir -p "$BACKUP_DIR"
  umask 077
  local file="$BACKUP_DIR/bebederos-$(date -u +%Y%m%d-%H%M%S).sql.gz"
  # --single-transaction: copia consistente de InnoDB sin bloquear la API ni el worker.
  # --triggers/--routines: conserva los triggers de inmutabilidad de lecturas e historial.
  "$MYSQLDUMP" --defaults-extra-file="$MYSQL_DEFAULTS_FILE" --single-transaction --quick \
    --triggers --routines --events --no-tablespaces --set-gtid-purged=OFF "$DB_NAME" | gzip -9 > "$file.tmp"
  mv "$file.tmp" "$file"
  gzip -t "$file"
  log backup.completed "\"file\":\"$(basename "$file")\",\"bytes\":$(wc -c < "$file")"
  find "$BACKUP_DIR" -name 'bebederos-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
}

restore() {
  : "${RESTORE_FILE:?Definir RESTORE_FILE}"
  : "${RESTORE_DB:?Definir RESTORE_DB (base vacía de ensayo)}"
  if [ "$RESTORE_DB" = "$DB_NAME" ]; then log restore.refused '"reason":"RESTORE_DB igual a la base operativa"'; exit 1; fi
  local tables
  tables=$("$MYSQL" --defaults-extra-file="$MYSQL_DEFAULTS_FILE" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$RESTORE_DB'")
  if [ "$tables" != "0" ]; then log restore.refused '"reason":"RESTORE_DB no está vacía"'; exit 1; fi
  gunzip -c "$RESTORE_FILE" | "$MYSQL" --defaults-extra-file="$MYSQL_DEFAULTS_FILE" "$RESTORE_DB"
  log restore.completed "\"database\":\"$RESTORE_DB\""
}

case "${1:-backup}" in
  backup) backup ;;
  restore) restore ;;
  *) echo "Uso: backup.sh [backup|restore]" >&2; exit 2 ;;
esac
