# Operación y despliegue

Instrucciones para preparar un servidor. Nada aquí contrata servicios ni despliega
automáticamente: cada paso lo ejecuta una persona con acceso al servidor.

## Componentes

| Proceso | Comando | Función |
|---|---|---|
| API | `npm run start --prefix database` (`server.js`) | Express en `127.0.0.1:PORT`, sesiones SQL, `/api/v1` |
| Worker | `npm run worker --prefix database` (`workers/index.js`) | Ciclo de 5 s: invitaciones, cola SMTP, agua/GPS/visitas/alertas/vigencia |
| Frontend | `npm run build --prefix frontend/mi-proyecto-shadcn` | Archivos estáticos en `frontend/mi-proyecto-shadcn/dist` |
| MySQL 8 | — | Base operativa con usuario limitado a esa base |

API y worker verifican las tres migraciones al arrancar y no modifican el esquema.
Ninguno ejecuta el seed: los datos del piloto solo se cargan con `npm run seed` en desarrollo/pruebas.

## Requisitos previos a operar

1. Node 22 y npm; `npm ci --prefix database` y `npm ci --prefix frontend/mi-proyecto-shadcn`.
2. MySQL 8.0.16+; base y usuario exclusivos (DDL y TRIGGER para migrar; con binlog activo, el
   administrador debe habilitar `log_bin_trust_function_creators` o migrar con un usuario con privilegio suficiente).
3. `database/.env` fuera del repositorio, a partir de `database/.env.example`:
   - `NODE_ENV=production`, `APP_URL=https://…` (la validación exige HTTPS en producción).
   - `SESSION_SECRET` y `OUTBOX_SECRET` distintos, de 32 bytes o más
     (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
   - `TRUST_PROXY=1` si hay exactamente un proxy (Nginx) delante; nunca `true`.
   - `SMTP_*` con TLS (465 implícito, 587 STARTTLS) y remitente; sin SMTP las invitaciones y
     enlaces quedan en cola y fallan tras los reintentos.
   - `WEATHER_URL=https://customer-api.open-meteo.com/v1/forecast` y `WEATHER_API_KEY` de la
     modalidad comercial; sin clave el clima responde indisponible (no se usa el servicio gratuito).
   - `DEMO_PASSWORD` vacío: está prohibido en producción.
4. `npm run check:env --prefix database` (valida sin conectar) y `npm run migrate --prefix database`.
5. Teselas del mapa: `VITE_TILE_URL` en `frontend/mi-proyecto-shadcn/.env.local` antes de compilar si
   no se usa OpenStreetMap; respetar su política de uso y atribución. Todo `VITE_*` es público.

## HTTPS y mismo origen

Frontend y API comparten dominio. La API escucha solo en loopback; Nginx termina TLS,
sirve `dist/` y reenvía `/api/` sin reescribir rutas ni convertir errores en HTML.

```nginx
server {
    listen 80;
    server_name bebederos.example;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    http2 on;
    server_name bebederos.example;
    ssl_certificate /etc/letsencrypt/live/bebederos.example/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bebederos.example/privkey.pem;
    add_header Strict-Transport-Security "max-age=31536000" always;
    root /srv/bebederos/frontend/mi-proyecto-shadcn/dist;

    location ^~ /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_intercept_errors off;
    }
    # El harness de pruebas no se publica.
    location ^~ /tests/ { return 404; }
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Con `NODE_ENV=production` la cookie de sesión es `Secure`, `HttpOnly`, `SameSite=Lax` y dura 24 h.
Toda escritura exige `X-CSRF-Token`. Límites: 600 solicitudes/min por IP y 30 cada 15 min en identidad.
El firewall debe bloquear el puerto de la API y de MySQL desde fuera.

## Supervisión de procesos

`deployment/processes.config.cjs` define API y worker para PM2:

```bash
npm install -g pm2
pm2 start database/deployment/processes.config.cjs
pm2 save && pm2 startup   # reinicio automático al arrancar el servidor
```

Una sola instancia de cada uno. El worker toma un bloqueo MySQL y rechaza una segunda instancia.
`SIGTERM` cierra limpio: la API deja de aceptar conexiones y espera respuestas en curso; el worker
termina el ciclo, libera el bloqueo y cierra conexiones. `kill_timeout` da 15/30 s antes de forzar.
Equivalente con systemd: un servicio por proceso, `Restart=always`, `KillSignal=SIGTERM`,
`TimeoutStopSec=30`, `EnvironmentFile` apuntando a `database/.env` con permisos 600.

## Salud y logs

- `GET /api/v1/health`: público y mínimo, `{status, database, time}`; 503 si MySQL no responde.
- `npm run health --prefix database`: monitoreo interno (cron/supervisor). Imprime JSON con el último
  ciclo exitoso, duración y código de error del worker; sale con código 1 si la base no responde, el
  worker lleva más de 15 s sin un ciclo exitoso o registró error. Ejemplo cada minuto:
  `* * * * * cd /srv/bebederos && npm run --silent health --prefix database || logger -t bebederos "salud degradada"`.
- API y worker escriben una línea JSON por evento en stdout (`time`, `level`, `event`, `process`):
  `http.request` (método, ruta sin query, estado, duración), `http.error` (solo nombre/código),
  `worker.cycle` (duración, atraso, procesados; con errores o lentitud y un latido por minuto),
  `worker.job_failed` (p. ej. `SMTP_FAILED`), `weather.refresh_failed`, inicio y cierre.
  Se redactan contraseñas, tokens, cookies, CSRF, payload de correo, credenciales y correos.
  Rotar con `pm2 install pm2-logrotate` o logrotate.

## Copia diaria y restauración

`database/scripts/backup.sh` usa `mysqldump --single-transaction` (consistente, sin bloquear) con
triggers, comprime, verifica el archivo y aplica retención (14 días por defecto). Credenciales en un
archivo de opciones MySQL con permisos 600 (`MYSQL_DEFAULTS_FILE`), nunca en argumentos.

```bash
# /etc/cron.d/bebederos-backup
0 3 * * * bebederos MYSQL_DEFAULTS_FILE=/etc/bebederos/backup.cnf DB_NAME=bebederos BACKUP_DIR=/var/backups/bebederos /srv/bebederos/database/scripts/backup.sh >> /var/log/bebederos/backup.log 2>&1
```

Copiar las copias fuera del servidor (otro disco o almacenamiento externo). Ensayo de restauración,
al menos mensual y antes de operar, sobre una base vacía distinta de la operativa:

```bash
mysql --defaults-extra-file=/etc/bebederos/backup.cnf -e "CREATE DATABASE bebederos_restore"
RESTORE_FILE=/var/backups/bebederos/bebederos-AAAAmmdd-HHMMSS.sql.gz RESTORE_DB=bebederos_restore \
  MYSQL_DEFAULTS_FILE=/etc/bebederos/backup.cnf DB_NAME=bebederos database/scripts/backup.sh restore
```

El script rechaza restaurar sobre `DB_NAME` o sobre una base con tablas. Comparar cantidades por
tabla y triggers; para recuperar la operación, detener API y worker, apuntar `DB_NAME` a la base
restaurada, ejecutar `npm run migrate` (no aplica nada si está al día) y reiniciar. Las muestras
reenviadas por la fuente tras la restauración se deduplican por `sourceKey`; las ya procesadas no se
reprocesan. Ensayo ejecutado el 2026-10-14 en MySQL 8.3 de pruebas: ver
`specs/001-monitoreo-bebederos/validation/recovery.md`.

## Desarrollo y pruebas

- Proxy de Vite: `/api` → `http://127.0.0.1:3000`, sin reescritura.
- Pruebas de integración: `database/.env.test` (copiar de `.env.test.example`) con base que termine
  en `_test` y usuario exclusivo (nunca root ni el operativo); `npm run test:integration --prefix database`.
- E2E con API real: `E2E_FULLSTACK=1` y variables `E2E_DB_*`/`E2E_OUTBOX_SECRET` de una base `_e2e`;
  API en 3000 y `npm run test:e2e --prefix frontend/mi-proyecto-shadcn`.
- Seed del piloto (2 dueños, peón compartido, 10 campos, 100 bebederos, 1.000 animales):
  `DEMO_PASSWORD=… npm run seed --prefix database` con `NODE_ENV=development`. Idempotente.
- Carga piloto: `npm run load:pilot --prefix database` (ver `scripts/load-pilot.js`).
