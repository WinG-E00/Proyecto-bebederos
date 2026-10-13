# Preparación del entorno y despliegue futuro

La fase T001–T008 configura herramientas. No despliega ni habilita autenticación,
migraciones o worker. El backend legacy todavía usa `sync({ force: true })`:
no arrancarlo contra una base que se necesite conservar. T009–T010 sustituirán ese arranque.

## Instalación reproducible

Desde la raíz, con Node 22 y npm:

```bash
npm ci --prefix database
npm ci --prefix frontend/mi-proyecto-shadcn
npm test --prefix database
npm test --prefix frontend/mi-proyecto-shadcn
npm run test:e2e:list --prefix frontend/mi-proyecto-shadcn
```

Las dependencias existentes conservan sus versiones del lockfile. Las adiciones se
fijan con versiones exactas. `migrate`, `seed` y `worker` en el package de backend
reservan sus comandos futuros: sus archivos se implementan en T010, T133 y T018.
No son comandos ejecutables todavía. `dev` conserva el arranque previo.

## Variables de entorno

Copiar `database/.env.example` a `.env` y completar secretos localmente. Ejecutar
`npm run check:env --prefix database` valida sin abrir MySQL, SMTP ni clima.
La configuración se integra al arranque nuevo en T009; el arranque legacy no usa
todavía `config/env.js`. No se reemplaza ningún `.env` local existente.

- `DB_*`: credenciales backend; MySQL 8, nombres de base alfanuméricos con guion bajo.
- `SESSION_SECRET` y `OUTBOX_SECRET`: valores diferentes, de al menos 32 bytes cada uno.
  Generar cada uno con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `PORT=3000`, `APP_URL=http://localhost:5173`, `VISIT_RADIUS_METERS=5` en desarrollo.
- `TRUST_PROXY=0` por defecto. En producción fijar la cantidad exacta de proxies
  confiables y bloquear acceso directo al servidor de API; no usar `true` indiscriminadamente.
- `SMTP_*`: solo backend; puerto 465 usa TLS implícito y 587 debe usar STARTTLS
  en el servicio futuro. Si se configura host, el remitente es obligatorio;
  usuario y contraseña se configuran juntos cuando el proveedor exige autenticación.
- `WEATHER_URL=https://customer-api.open-meteo.com/v1/forecast` y `WEATHER_API_KEY`:
  solo backend. Configurar credencial comercial antes de operación real.
- `DEMO_PASSWORD`: solo cuentas de pruebas/seed, mínimo 10 caracteres y máximo
  72 bytes UTF-8; prohibido en producción.
- `MAP_TILE_URL`: URL pública de referencia, sin credenciales ni query string.
  La interfaz futura consumirá `VITE_MAP_TILE_URL` de un `.env.local` ignorado bajo
  `frontend/mi-proyecto-shadcn/`. Todo `VITE_*` es público: nunca usarlo para SMTP,
  sesiones, cola, base de datos o claves comerciales privadas. El mapa existente
  mantiene por ahora su URL pública; su integración configurable corresponde a US4.

## MySQL exclusivo para pruebas

Copiar `database/.env.test.example` a `.env.test` y crear previamente una base que
termine en `_test`, distinta de `DB_NAME`. Usar un usuario exclusivo con permisos
solo sobre esa base, nunca root ni el usuario operativo. No hay fallback a `DB_*`.
`tests/helpers/testDatabase.js` rechaza configuraciones inseguras antes de construir
una conexión. Importarlo no abre conexiones ni ejecuta `sync`, DROP o DELETE.

Las pruebas de integración futuras llamarán `loadTestEnvironment()` y
`prepareTestDatabase(migrate)` con el migrador explícito de T010. Deben cerrar la
conexión al terminar. Ejecutar `npm run test:integration --prefix database` después
de incorporar esas pruebas y migraciones. En fase 1 todavía no hay casos de dominio
de integración: el comando falla con «No test files found», sin simular aceptación.
Las pruebas unitarias actuales verifican guardas, reloj/proveedores y Supertest,
sin usar MySQL operativo. No se presume que estas pruebas validen transacciones reales.

## Playwright y referencia visual

Instalar Chromium y ejecutar desde la raíz:

```bash
npm exec --prefix frontend/mi-proyecto-shadcn -- playwright install chromium
npm run test:e2e --prefix frontend/mi-proyecto-shadcn
npm run capture:baseline --prefix frontend/mi-proyecto-shadcn
```

Si se instala en otro directorio, usar el mismo `PLAYWRIGHT_BROWSERS_PATH` al instalar
y ejecutar. La verificación inicial usó `/tmp/bebederos-playwright`.
Playwright inicia solo Vite, en 127.0.0.1:5173, y rechaza un puerto ocupado.
Las capturas usan los componentes originales mediante `/tests/baseline/index.html`;
no son rutas de producto ni prueban login. Las teselas se sustituyen por una imagen
local y el reloj se fija. Los proyectos cubren 375, 768 y 1280 px. Las cuentas futuras
usan `@test.invalid` y nombres «de prueba E2E» en `tests/e2e/helpers.js`; no se crean
cuentas reales ni se hace seed al arrancar estas pruebas.

## Proxy de desarrollo

Vite reenvía `/api` a `http://127.0.0.1:3000`, conservando ruta y código HTTP.
El cliente futuro usará rutas relativas `/api/v1/...`; ningún error 401/404/500 de
API debe convertirse en HTML de la SPA. Las URL absolutas de login/registro legacy
se adaptarán en US1. No arrancar ese backend para verificar el proxy: usar un servidor
HTTP controlado de prueba.

## Mismo origen HTTPS en producción

Ejemplo de Nginx para adaptar cuando se implemente el despliegue de T139. Frontend y
API comparten `https://bebederos.example`; certificados y DNS se configuran entonces.
La API escucha solo en loopback y Express confía únicamente en el proxy configurado.

```nginx
server {
    listen 443 ssl;
    server_name bebederos.example;
    ssl_certificate /ruta/al/certificado.pem;
    ssl_certificate_key /ruta/a/la/clave.pem;
    root /ruta/frontend/dist;

    location = /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_intercept_errors off;
    }
    location ^~ /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_intercept_errors off;
    }
    # No publicar archivos del harness de pruebas o configuraciones.
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Redirigir HTTP a HTTPS en un bloque separado. No agregar `error_page` que redirija
errores API a `/index.html`. Conservar cookies y `X-CSRF-Token`; las cookies Secure
y las rutas protegidas se implementan en US1. Antes de publicar se requieren también
supervisión de API/worker, migraciones, backups y restauración de T139.

Referencias de configuración: [Vitest](https://vitest.dev/config/file),
[Playwright webServer](https://playwright.dev/docs/test-webserver) y
[proyectos Playwright](https://playwright.dev/docs/test-projects).
