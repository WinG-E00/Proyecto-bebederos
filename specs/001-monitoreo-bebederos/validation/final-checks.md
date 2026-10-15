# Verificación final (T141)

Ejecutada el 2026-10-14 en la computadora de desarrollo (Windows 11, Node 24.16). MySQL 8.3 temporal y exclusivo de pruebas (127.0.0.1:3310, bases `*_test` y `*_e2e`, usuario limitado); no se usó la base ni el `.env` operativos. E2E con Edge instalado (`channel: 'msedge'`) y API real.

| Comando | Resultado |
|---|---|
| `npm test --prefix database` | 10 archivos, **91/91** |
| `npm run test:integration --prefix database` | 24 archivos, **135/135** (contratos e integración MySQL) |
| `npm test --prefix frontend/mi-proyecto-shadcn` | 5 archivos, **21/21** |
| `npm run lint --prefix frontend/mi-proyecto-shadcn` | Sin errores |
| `npm run build --prefix frontend/mi-proyecto-shadcn` | Correcto; aviso de Vite por bloque >500 kB (sin dividir código en el MVP) |
| `npm run test:e2e --prefix frontend/mi-proyecto-shadcn` | **60/60** recorridos (20 pruebas × 375/768/1280 px) |
| `npm run load:pilot --prefix database -- --minutes=3` | 20 usuarios, 100% de cambios visibles ≤30 s ([performance](performance.md)) |
| `scripts/backup.sh` y `restore` | Copia y restauración idénticas ([recovery](recovery.md)) |

## Correcciones de alcance durante esta verificación

- `tests/auth.test.jsx`: el panel ahora espera el resumen real (`/dashboard`); la prueba simula ese endpoint y `ResizeObserver` (jsdom no lo implementa).
- `tests/e2e/history-dashboard.spec.js`: variable sin uso que hacía fallar ESLint.
- Áreas táctiles de 44 px en login, registro y barra lateral del dueño ([visual-review](visual-review.md)).

## Observaciones

- `database/` no tiene ESLint configurado (nunca lo tuvo); solo el frontend define `lint`. No se agregó para no ampliar dependencias.
- `proxy.spec.js` levanta su propio servidor en el puerto 3000, así que se ejecuta con la API detenida: en la corrida completa sus 6 casos fallaron por puerto ocupado y pasaron 6/6 al repetirlos con el puerto libre. El total 60/60 cuenta esa repetición.
- E2E crean muchas cuentas desde 127.0.0.1: para no chocar con el límite de identidad (30/15 min) la API de prueba se inició con límites altos mediante `startServer({ limits })`. Los límites productivos no cambiaron y se prueban aparte (429 en `security.test.js`).
- Las bases de prueba conservan filas entre ejecuciones (historial inmutable); usar bases descartables.
