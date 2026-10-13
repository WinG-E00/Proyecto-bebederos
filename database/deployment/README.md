# Preparación del entorno y despliegue futuro

T001–T020 están implementadas. La API se construye en `app.js` y arranca en
`server.js`, sin sincronizar ni recrear tablas. Las rutas legacy están deshabilitadas.
Autenticación y rutas de negocio se incorporan en las historias siguientes.
El worker independiente procesa correo encolado; agua/GPS/alertas todavía no están habilitados.

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
fijan con versiones exactas. `migrate` y `worker` ya están implementados; `seed`
sigue reservado para T133. `dev` inicia `server.js` con watch y `start` sin watch.

## Variables de entorno

Copiar `database/.env.example` a `.env` y completar secretos localmente. Ejecutar
`npm run check:env --prefix database` valida sin abrir MySQL, SMTP ni clima.
La configuración se valida al iniciar API, migrador y worker.
No se reemplaza ningún `.env` local existente.

- `DB_*`: credenciales backend; MySQL 8, nombres de base alfanuméricos con guion bajo.
- `SESSION_SECRET` y `OUTBOX_SECRET`: valores diferentes, de al menos 32 bytes cada uno.
  Generar cada uno con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `PORT=3000`, `APP_URL=http://localhost:5173`, `VISIT_RADIUS_METERS=5` en desarrollo.
- `TRUST_PROXY=0` por defecto. En producción fijar la cantidad exacta de proxies
  confiables y bloquear acceso directo al servidor de API; no usar `true` indiscriminadamente.
- `SMTP_*`: solo backend; puerto 465 usa TLS implícito y 587 debe usar STARTTLS
  en el transporte implementado. Si se configura host, el remitente es obligatorio;
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

Las pruebas de integración usan `loadTestEnvironment()` y `migrateDatabase(db)`.
Se ejecutan con `npm run test:integration --prefix database`, con configuración
de pruebas completa. Verifican migraciones, restricciones, permisos, historial,
correo durable y arranque/cierre sobre MySQL 8 real. Los fixtures tienen identificadores
únicos por ejecución y no borran hechos históricos. Usar una base descartable para
evitar acumular fixtures indefinidamente. La fase 2 utilizó una base exclusiva
en un contenedor MySQL 8.4, nunca la conexión del `.env` operativo.

## Migraciones y procesos disponibles

Crear previamente una base MySQL 8.0.16+ de la familia 8, con usuario limitado a ella,
completar `.env` y ejecutar desde la raíz:

```bash
npm run check:env --prefix database
npm run migrate --prefix database
npm run start --prefix database
```

En otra terminal: `npm run worker --prefix database`.
API y worker verifican las tres versiones en `SchemaMigrations` y no modifican el
esquema al arrancar. El migrador usa Umzug con almacenamiento de versiones SQL
explícito, un bloqueo asesor por base y DDL no destructivo. Las tablas ya creadas
por una ejecución interrumpida se conservan y se retoma la misma versión. No hay
comando de reset ni rollback destructivo: los cambios posteriores exigen otra migración.

La cuenta que ejecuta migraciones necesita permisos DDL y TRIGGER en esa base.
Con binlog habilitado, MySQL puede exigir configuración administrativa adicional
para crear triggers. El administrador debe resolverlo antes de migrar; el script
no cambia variables globales. En el contenedor aislado se habilitó
`log_bin_trust_function_creators` exclusivamente para las pruebas.

El esquema usa nombres de tablas/campos en inglés (`Accounts`, `Farms`,
`Assignments`, etc.), estados de negocio en español y tipos internos documentados
en las migraciones. `Sessions` tiene `sid`, `data`, `expires`, `createdAt`, `updatedAt`
compatibles con connect-session-sequelize; la sesión se conectará en US1.
Los modelos compartidos son fábricas registradas sobre una instancia explícita de
Sequelize. Los modelos/controladores legacy no se importan por el arranque nuevo.

La cola solo admite invitación, verificación y recuperación vinculadas a un token
vigente. Exige la transacción del cambio de identidad, usa AES-256-GCM y secreto
separado, y elimina el payload al enviar o vencer; las referencias pendientes
se revalidan antes de cada envío y se retiran si ya no son válidas. Un intento inicial
y hasta tres reintentos esperan 1, 2 y 4 minutos. No almacena errores SMTP privados.
El bloqueo de fila evita doble envío concurrente; SMTP y MySQL no comparten una
transacción: un crash después de aceptación SMTP y antes del commit puede reenviar.
La aceptación SMTP no acredita entrega al buzón.

El worker tiene ciclo de 5 segundos, no solapa ciclos, mantiene salud persistente,
retoma la cola al reiniciar y usa un bloqueo asesor para impedir dos instancias
sobre la misma base. SIGINT/SIGTERM esperan el trabajo en curso y cierran conexiones.
La salud no sustituye la futura marcación transaccional de cada muestra.

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
El cliente compartido `src/services/api.js` usa rutas relativas `/api/v1/...`; ningún error 401/404/500 de
API debe convertirse en HTML de la SPA. Las URL absolutas de login/registro legacy
se adaptarán en US1. Las pruebas de proxy usan un servidor HTTP controlado de prueba.

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
