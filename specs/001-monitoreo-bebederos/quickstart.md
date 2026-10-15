# Guía de puesta en marcha y validación

**Estado (2026-10-14)**: fases 1–12 implementadas (T001–T143 salvo T140, evaluación con usuarios). Operación y despliegue en [database/deployment/README.md](../../database/deployment/README.md). Evidencias en [validation/](validation/), resumen final en [validation/final-checks.md](validation/final-checks.md) y matriz en [validation/acceptance.md](validation/acceptance.md).

## Entorno mínimo

- Node.js 22 o superior y npm (verificado también con Node 24.16).
- MySQL 8.0.16+ con bases separadas de desarrollo, pruebas (`*_test`) y E2E (`*_e2e`), cada una con usuario limitado a su base. Con binlog activo, el administrador debe permitir crear los triggers de inmutabilidad (`log_bin_trust_function_creators`) al migrar.
- Para operar: SMTP con TLS y credencial comercial de Open-Meteo. Para desarrollo y pruebas no hacen falta: el correo queda en la cola cifrada y el clima responde indisponible o se simula.
- E2E: navegador Chromium de Playwright (`npm exec --prefix frontend/mi-proyecto-shadcn -- playwright install chromium`) o Edge instalado (`channel: 'msedge'`).

## Configuración

Copiar `database/.env.example` a `database/.env` (no se versiona) y completar. Ninguna clave privada va al frontend: todo `VITE_*` es público.

| Parámetro | Propósito |
|---|---|
| `NODE_ENV`, `PORT` | Entorno y puerto de API (3000 en desarrollo) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | MySQL del entorno |
| `SESSION_SECRET`, `OUTBOX_SECRET` | Secretos distintos de ≥32 bytes |
| `APP_URL` | URL pública para enlaces (`http://localhost:5173`; HTTPS en producción) |
| `VISIT_RADIUS_METERS` | Radio de visitas, 5 m |
| `SMTP_*` | Correo (opcional en desarrollo) |
| `WEATHER_URL`, `WEATHER_API_KEY` | Open-Meteo comercial; sin clave el clima figura indisponible |
| `TRUST_PROXY` | Cantidad exacta de proxies; 0 en desarrollo |
| `DEMO_PASSWORD` | Contraseña de las cuentas del seed; prohibida en producción |
| `VITE_TILE_URL` (frontend, `.env.local`) | Teselas del mapa; OpenStreetMap por defecto |

`npm run check:env --prefix database` valida sin conectar.

## Instalación y ejecución

```bash
npm ci --prefix database
npm ci --prefix frontend/mi-proyecto-shadcn
npm run migrate --prefix database
npm run seed --prefix database
```

`seed` (solo `NODE_ENV=development` o `test`, idempotente) crea el piloto: dueños `duenio-a@bebederos-piloto.invalid` y `duenio-b@bebederos-piloto.invalid`, peón compartido `peon@bebederos-piloto.invalid` (contraseña `DEMO_PASSWORD`), 10 campos, 100 bebederos, 1.000 animales, lecturas iniciales con niveles 0/5/19/20/35/49/50/62/85/100 y posiciones GPS. `--no-samples` omite las muestras. API y worker nunca ejecutan el seed.

En terminales separadas:

```bash
npm run dev --prefix database
npm run worker --prefix database
npm run dev --prefix frontend/mi-proyecto-shadcn
```

Abrir `http://localhost:5173`. El worker procesa agua/GPS/visitas/alertas cada 5 s aun sin usuarios conectados; las vistas consultan cada 10 s.

Muestras manuales (solo desarrollo/pruebas; clave de fuente repetida con los mismos datos es idempotente):

```bash
npm run sample --prefix database -- water '{"sourceKey":"pilot-water-001","resourceId":1,"percentage":19,"measuredAt":"2026-10-14T03:00:00.000Z"}'
npm run sample --prefix database -- animalPosition '{"sourceKey":"pilot-gps-001","resourceId":1,"latitude":-26,"longitude":-59,"measuredAt":"2026-10-14T03:00:00.000Z"}'
```

Salud: `GET /api/v1/health` (público, mínimo) y `npm run health --prefix database` (interno: último ciclo del worker; código 1 si está degradado). Logs: una línea JSON por evento, sin secretos.

## Verificación automática

```bash
npm test --prefix database
npm run test:integration --prefix database
npm test --prefix frontend/mi-proyecto-shadcn
npm run lint --prefix frontend/mi-proyecto-shadcn
npm run build --prefix frontend/mi-proyecto-shadcn
npm run test:e2e --prefix frontend/mi-proyecto-shadcn
npm run load:pilot --prefix database -- --minutes=3
```

- Integración: `database/.env.test` (de `.env.test.example`) con base `*_test` y usuario exclusivo, nunca root ni el operativo. Las pruebas migran esa base y no borran filas.
- E2E: API real en 3000 apuntando a una base `*_e2e`, más `E2E_FULLSTACK=1`, `E2E_DB_HOST/PORT/NAME/USER/PASSWORD` y `E2E_OUTBOX_SECRET` iguales a los de esa API. Playwright inicia Vite en 5173. Muchas cuentas seguidas desde la misma IP alcanzan el límite de identidad (30/15 min): reiniciar la API entre tandas o usar en local un lanzador con límites altos (`startServer({ limits })`).
- `load:pilot`: 20 usuarios contra la API en `LOAD_BASE_URL` (por defecto `http://127.0.0.1:3000/api/v1`) con `DEMO_PASSWORD`; inicia su propio worker salvo `--no-worker`. Crea 17 peones de carga en el dominio del piloto.

## Validación ejecutada

| Escenario | Evidencia |
|---|---|
| Cuenta, verificación, recuperación, sesión | [US1](validation/US1.md) |
| Campos, bebederos, animales/GPS/visitas/mapa | [US2](validation/US2.md), [US3](validation/US3.md), [US4](validation/US4.md) |
| Invitaciones, equipo, revocación | [US5](validation/US5.md) |
| Tareas y concurrencia | [US6](validation/US6.md) |
| Alertas y vigencia | [US7](validation/US7.md) |
| Clima | [US8](validation/US8.md) |
| Historial y dashboards | [US9](validation/US9.md) |
| Aislamiento SC-002 | [security.md](validation/security.md) |
| Carga y vista abierta SC-003 | [performance.md](validation/performance.md) |
| Reinicios, correo, copia/restauración | [recovery.md](validation/recovery.md) |
| Táctil, teclado y responsive | [visual-review.md](validation/visual-review.md) |
| Evaluación con usuarios | [usability.md](validation/usability.md) — **pendiente** |

## Pendiente de configuración para operar

- SMTP real y credencial comercial de Open-Meteo (no contratados).
- Política y proveedor de teselas para el volumen real.
- Servidor con HTTPS, PM2/systemd, copia diaria y ensayo de restauración según `deployment/README.md`.
- Repetir la carga piloto en ese servidor y la evaluación con usuarios reales.
