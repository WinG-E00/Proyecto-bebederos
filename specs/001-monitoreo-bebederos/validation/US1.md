# Verificación de US1 — Acceso con rol único (T021–T034)

Fecha: 2026-10-13. Alcance: únicamente la fase 3 (US1), sobre la base de la fase 2 ya
integrada en `develop`. Sin commits ni pushes. La checklist de requisitos sigue 16/16; no
hay `.specify/extensions.yml` ni hooks registrados.

## Resultado por tarea

| Tarea | Implementación y evidencia |
|---|---|
| T021 | `database/tests/contract/auth.test.js`: 26 casos sobre csrf, register, login, me, logout, verify, resend-verification, forgot, reset, profile, preview/accept y 429. Respuestas genéricas, rol/ownerId/perfilId/verificación rechazados con 422 y cuerpos sin hash, token, SQL ni stack |
| T022 | `database/tests/integration/auth.test.js`: 16 casos con fixtures de dos dueños, campos e invitaciones en MySQL. Verificación 24 h y recuperación 30 min exactas, invalidación por reenvío, sesiones SQL, rotación de CSRF, invitación de siete días exactos y aislamiento |
| T023 | `Account.model.js` (correo normalizado, rol/correo no editables, serializador sin hash), `IdentityToken.model.js` (token aleatorio, solo hash SHA-256 en MySQL) y `session.service.js` (almacén `Sessions` de la migración 001; invalidación de todas las sesiones de una cuenta) |
| T024 | `auth.schemas.js`: objetos Zod estrictos; contraseña de 10 caracteres a 72 bytes UTF-8; no se aceptan rol, dueño, verificación ni propiedades extra |
| T025 | `session.js` (cookie `bebederos.sid` HttpOnly, SameSite=Lax, Secure en producción, 24 h sin renovación, regeneración en login), `csrf.js` (token sincronizado en `X-CSRF-Token` para toda escritura) y `security.js` (Helmet, 600/min general y 30/15 min de identidad por IP) |
| T026 | `auth.service.js`: registro público siempre dueño; login con comparación bcrypt de tiempo uniforme; verificación, reenvío, recuperación y perfil. Correos en la cola cifrada de la fase 2 dentro de la misma transacción; tokens anteriores invalidados; cambio de contraseña cierra todas las sesiones |
| T027 | `invitationAcceptance.service.js`: preview público `{valid, reason}`, validación para registro de peón y aceptación transaccional con bloqueo de fila. Correo coincidente, cuenta peón, solo campos vigentes del emisor; repetir no duplica ni reactiva accesos revocados |
| T028 | `auth.router.js`, `profile.router.js` e `invitationAcceptance.router.js` montados bajo `/api/v1` desde `server.js`. `user.router.js` y `perfil.router.js` legacy quedaron vacíos y documentados; `/api/user` y `/api/perfil` siguen respondiendo 404 |
| T029 | Login y registro existentes adaptados (sin selector de rol, correo conservado, contraseña nunca re-mostrada) y `IdentityActions.jsx` con verificar, olvidé y restablecer en el mismo diseño del login |
| T030 | `InvitationAccess.jsx`: el token sale de la URL al abrir y vive solo en memoria; crear cuenta o iniciar sesión y aceptar explícitamente; mensajes para vencida, retirada, usada, sin campos y cuenta dueño |
| T031 | `useAuth.js` (cuenta desde `/auth/me` cada 10 s, nunca desde localStorage), `ProtectedRoute.jsx`, rutas del contrato en `App.jsx` y providers en `main.jsx`. Corregida la importación con casing incorrecto de `InterfazPeon` |
| T032 | `Profile.jsx`: nombre editable, correo y rol solo lectura, cerrar sesión. Al salir o cambiar de cuenta se retiran todas las consultas de la cuenta anterior |
| T033 | `frontend/mi-proyecto-shadcn/tests/e2e/auth.spec.js` + `identityHelpers.js`: API Express real, MySQL de pruebas migrado y captura SMTP desde la cola cifrada. Se omite si no se define `E2E_FULLSTACK=1` |
| T034 | Este documento |

## Pruebas ejecutadas

| Comprobación | Resultado |
|---|---|
| `npm test --prefix database` | 60/60 (20 nuevas de US1: esquemas, tokens, cookies, CSRF, 429, rutas legacy) |
| `npm run test:integration --prefix database` | 57/57 en MySQL 8.3 real, dos ejecuciones seguidas sobre la misma base (42 de US1 + 15 de la fase 2) |
| `npm test --prefix frontend/mi-proyecto-shadcn` | 18/18 (8 nuevas de US1 con API simulada) |
| Playwright US1 (`auth.spec.js`) en 375, 768 y 1280 px | 9/9 contra API real y MySQL |
| Playwright existentes (baseline, proxy, confirmación) | 18/18; `auth.spec.js` se omite sin `E2E_FULLSTACK` |
| `vite build` | Correcto (aviso de tamaño de bundle ya existente) |
| ESLint `src` y `tests` | Sin errores nuevos. Persiste el error previo de `src/components/ui/button.jsx` (react-refresh), ajeno a US1 |

MySQL usado: instancia temporal 8.3.0 levantada desde los binarios locales de WAMP en
`127.0.0.1:33307`, con datos en una carpeta temporal fuera del repositorio y bases
exclusivas `bebederos_us1_test` y `bebederos_us1_e2e`. No se tocó el MySQL de WAMP en
uso ni ningún `.env`. Igual que en la fase 2, los triggers de la migración 002 exigen
`log_bin_trust_function_creators=1` en esa instancia aislada.

Playwright se ejecutó con Microsoft Edge instalado (`channel: 'msedge'`) mediante una
configuración temporal fuera del repositorio, porque Chromium de Playwright no está
descargado en esta máquina. No se descargaron navegadores.

## SC-002 e identidad

| Caso | Evidencia |
|---|---|
| Registro libre crea solo dueño | Contrato: rol del cliente → 422; fila `role='owner'`. E2E: el formulario no tiene selector de rol |
| Peón solo por invitación del mismo correo | Integración: invitación vencida, retirada o de otro correo → 422 sin crear cuenta |
| Dueño no acepta como peón | Contrato e integración: 403 `ROLE_INCOMPATIBLE` y el rol sigue `owner`. E2E: sin botón de aceptar |
| El enlace verifica al peón sin dar acceso | Integración y E2E: cero asignaciones hasta pulsar «Aceptar invitación» |
| Repetir aceptación | No duplica ni reactiva una asignación revocada después |
| Sesión cerrada | Logout → 401 en `/auth/me` y la ruta `/dashboard` vuelve a `/login` |
| Cambio de contraseña | Todas las sesiones de esa cuenta → 401; otra cuenta sigue activa. E2E: la pestaña abierta vuelve a login en menos de 30 s |
| Ausencia de datos ajenos | `/auth/me` y `PATCH /profile` solo exponen y modifican la cuenta de la cookie; la caché de React Query se vacía al salir o cambiar de cuenta |

Cookies observadas: `bebederos.sid` con HttpOnly, SameSite=Lax y Max-Age de 86400 s;
Secure solo con `NODE_ENV=production` detrás del proxy HTTPS configurado. Ningún rol,
token de sesión, CSRF ni token de enlace queda en localStorage o sessionStorage.

Sesión reiniciada: se inició sesión, se detuvo la API y se volvió a iniciar; `/auth/me`
siguió respondiendo 200 porque la sesión vive en la tabla `Sessions`. Al iniciar sesión
la cookie y el token CSRF cambian, y el token anónimo anterior deja de servir.

## Decisiones y desvíos a revisar

- `POST /auth/register` público responde 202 `{account: null, needsVerification: true}`
  también para correos ya registrados, para no revelar cuentas. El contrato muestra
  `{account, needsVerification}`; el registro de peón con invitación sí devuelve 201 con
  la cuenta.
- Login exige correo verificado (403 `EMAIL_NOT_VERIFIED`), con opción de reenviar el enlace.
- Invitación vencida, retirada, usada o sin campos responde 409 con códigos propios:
  el manejador de errores de la fase 2 solo admite 401/403/404/409/422/429/503.
- Aceptar una invitación también marca el correo del peón como verificado; restablecer la
  contraseña desde el enlace del correo también lo verifica.
- La tabla `Sessions` no tiene columna de cuenta: se invalidan por
  `JSON_EXTRACT(data, '$.accountId')`. No se agregó migración.
- `/` redirige a `/dashboard` o `/login`; la pantalla de selección de rol
  (`interfaz-principal.jsx`) ya no se enruta porque guardaba el rol en localStorage.
- El límite de identidad (30 cada 15 min por IP) impide correr las tres resoluciones del
  E2E completo contra una misma API: se ejecutó una resolución por arranque de API.
- `tests/integration/foundational.test.js` ahora pasa `SESSION_SECRET` y `APP_URL` a
  `startServer`, porque la API monta sesiones.

## Fuera de alcance de US1

No se declaran cubiertos campos, bebederos, animales, mapas, equipo, emisión de
invitaciones (US5), tareas, alertas, clima ni historial. Los paneles de dueño y peón
siguen mostrando sus datos de ejemplo; solo se agregó la barra de cuenta con perfil y
cierre de sesión encima. Tampoco se envió correo real: SMTP no estaba configurado y
la captura se hizo leyendo la cola cifrada.

## Cómo repetir el E2E completo

```bash
npm run migrate --prefix database
npm run dev --prefix database
E2E_FULLSTACK=1 E2E_DB_HOST=127.0.0.1 E2E_DB_PORT=3306 E2E_DB_NAME=bebederos_e2e E2E_DB_USER=… E2E_DB_PASSWORD=… E2E_OUTBOX_SECRET=<OUTBOX_SECRET de la API> npm run test:e2e --prefix frontend/mi-proyecto-shadcn -- auth.spec.js --project=desktop-1280
```

La API debe usar la misma base de pruebas y el mismo `OUTBOX_SECRET` que el comando.
