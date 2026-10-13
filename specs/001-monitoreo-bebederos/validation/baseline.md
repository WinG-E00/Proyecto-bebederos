# Baseline y verificación de preparación — T001–T008

Fecha: 2026-10-13. Referencia inicial: commit `87c502d`, rama `develop`, árbol limpio
antes de implementar. Entorno observado: Node `22.23.1`, npm `10.9.8`.
Alcance: preparación del proyecto existente. Se conservan los componentes, estilos,
recursos y versiones previas. No se implementaron tareas desde T009 en adelante.

## Estado inicial e importaciones

| Área | Estado observado | Trabajo previsto |
|---|---|---|
| Entrada React | `src/main.jsx` carga `src/App.jsx`; este importa `./src/pages/InterfazPeon/InterfazPeon.jsx`, inexistente | T031 corrige la ruta real `./pages/interfazPeon/InterfazPeon.jsx` y conecta navegación por rol |
| Panel dueño | `src/pages/InterfazDuenio/InterfazDuenio.jsx`, CSS propio, logo y fotografía, tarjetas y modo oscuro; datos de ejemplo | Conservar composición y recursos; conectar agregados reales en T128 |
| Panel peón | `src/pages/interfazPeon/InterfazPeon.jsx`, CSS propio, `datosEjemplo.js`, `MapaBebederos.jsx`/Leaflet | Conservar tarjetas y mapa; T129 sustituye ejemplos y retira hidratación/supuesta bebida |
| Acceso | `interfaz-principal` abre módulo de acceso; login/registro hacen fetch a URL absoluta `localhost:3000`; rol elegido en localStorage | US1 adapta API relativa, sesiones, invitaciones y rol autorizado por backend |
| Backend | `database/app.js` construye Express y arranca MySQL con `sync({ force: true })` | T009 separa arranque, retira sincronización destructiva y protege rutas antiguas |
| Login previo | Ruta sin `/` inicial; controlador usa bcrypt sin importación, consulta incompleta y no genera sesión | US1 sustituye contrato y controladores |
| Credenciales | `database/.env` estaba versionado | T004 lo retira del índice; archivo local conservado e ignorado. El historial previo de Git no se reescribió |

Rutas HTTP iniciales, registradas por inspección (no se arrancó la API):

- `GET /test`.
- `POST /api/user/create` y `POST api/user/login` (falta `/` inicial en login).
- `POST /api/perfil/create`.
- `POST /api/bebederos/create`.
- `POST /api/bebederos/UserId/:id`.
- `POST /api/bebederos/bebederoId/:id`.
- `POST /api/bebederos/getAllBebederos/:id`.

Todavía no hay router frontend ni navegación integrada por rol. Los enlaces del panel
dueño apuntan a anclas internas. Los endpoints existentes no equivalen al contrato `/api/v1`.

## Capturas de los paneles originales

Se renderizaron directamente los componentes originales en una entrada exclusiva de
revisión: `frontend/mi-proyecto-shadcn/tests/baseline/index.html`, con `?role=owner`
o `?role=worker`. Esto permite registrar el diseño aunque `App.jsx` tenga una
importación rota. No se modifica ni se evita esa falla en la aplicación de producto.

Las capturas usan modo claro, datos de ejemplo existentes y reloj fijo
`2026-10-13T12:00:00Z` (zona Argentina). Se cargaron los recursos y las fuentes.
Las teselas externas fueron sustituidas por una imagen local: los marcadores y
controles reales de Leaflet aparecen sobre fondo neutro, sin consultar proveedores.
Se inspeccionaron visualmente los PNG del dueño en escritorio y del peón en móvil;
Playwright verificó títulos, control de tema y ausencia de errores JS en las seis vistas.

| Ancho | Dueño | Peón |
|---|---|---|
| 375 px | [Captura](screenshots/owner-mobile-375.png) | [Captura](screenshots/worker-mobile-375.png) |
| 768 px | [Captura](screenshots/owner-tablet-768.png) | [Captura](screenshots/worker-tablet-768.png) |
| 1280 px | [Captura](screenshots/owner-desktop-1280.png) | [Captura](screenshots/worker-desktop-1280.png) |

La referencia conserva verdes, tarjetas claras, iconografía, tipografía y fotografías.
La captura del peón muestra los indicadores de hidratación y tiempo bebiendo previos:
se documentan para retirarlos al integrar US9, no como funcionalidades aceptadas del MVP.

## Resultado por tarea

| Tarea | Resultado verificado |
|---|---|
| T001 | Estado inicial, rutas, importaciones y seis capturas registradas |
| T002 | Dependencias de backend del plan y scripts de pruebas agregados; scripts futuros migrate/seed/worker identificados como pendientes de implementación |
| T003 | React Router, TanStack Query y herramientas de pruebas instalados; ninguna versión anterior del lockfile cambió |
| T004 | Ejemplos de entorno, validador sin efectos y reglas de ignore; secretos separados, backend privado y pruebas de rechazo de configuración insegura |
| T005 | Vitest con proyectos unit/integration, Supertest, helper MySQL aislado y dependencias sustituibles; 15 pruebas de herramientas/seguridad aprobadas |
| T006 | Vitest reutiliza alias/plugins de Vite; jsdom, RTL, jest-dom, user-event y limpieza entre pruebas; una prueba sobre el panel original aprobada |
| T007 | Playwright configurado en 375/768/1280 px, cuentas/datos de prueba identificados y servidor solo frontend; seis recorridos de referencia aprobados |
| T008 | Proxy `/api` preserva ruta, JSON, estados, cookies, CSRF y cuerpo; seis pruebas de transporte aprobadas; HTTPS/mismo origen/fallback documentados |

## Evidencia de ejecución

| Comando/comprobación | Resultado |
|---|---|
| `npm ci --prefix database` | Aprobado: instalación limpia según lockfile (200 paquetes) |
| `npm ci --prefix frontend/mi-proyecto-shadcn` | Aprobado: instalación limpia según lockfile (517 paquetes) |
| Comparación de versiones fijadas con el commit inicial | Sin cambios en entradas existentes de ambos lockfiles |
| `npm test --prefix database` | 15/15 aprobadas, también después de instalación limpia |
| `npm test --prefix frontend/mi-proyecto-shadcn` | 1/1 aprobada, también después de instalación limpia |
| `npm run capture:baseline --prefix frontend/mi-proyecto-shadcn` | 6/6 aprobadas; seis PNG guardados |
| `npm run test:e2e --prefix frontend/mi-proyecto-shadcn` | 12/12 aprobadas: paneles y proxy en los tres proyectos |
| ESLint sobre configs y `tests/` del frontend | Aprobado |
| `node --check` de env/helper MySQL | Aprobado |
| `git diff --check` | Aprobado |
| Checklist `requirements.md` | 16/16 revisados; sin modificar la checklist |
| Hooks previos/posteriores | No existe `.specify/extensions.yml` |

Las descargas requirieron acceso a red fuera del sandbox. Supertest, Vite y Playwright
requirieron permisos para puertos locales. Chromium se instaló en
`/tmp/bebederos-playwright`; usar `PLAYWRIGHT_BROWSERS_PATH=/tmp/bebederos-playwright`
para repetir los comandos de navegador en este entorno o reinstalarlo en su ruta habitual.

## Limitaciones previas y validación futura

- `npm run build --prefix frontend/mi-proyecto-shadcn` falla antes de los cambios
  por la importación inexistente en `src/App.jsx`; se registró para T031.
- `npm run lint --prefix frontend/mi-proyecto-shadcn` conserva exactamente los cinco
  errores iniciales: cuatro imports sin uso en `App.jsx` y exportación de constantes
  junto al componente en `src/components/ui/button.jsx`. Las herramientas nuevas
  pasan su chequeo de lint; no se alteró código de producto para ocultar errores previos.
- `npm run test:integration --prefix database` informa «No test files found»:
  todavía no hay migraciones/casos de dominio de las siguientes fases. Se verificó
  la protección del helper sin conectarse ni borrar bases. Las transacciones reales
  deben validarse con MySQL 8 exclusivo de pruebas después de T010.
- El validador de entorno se integra al arranque nuevo en T009. Las credenciales
  SMTP/clima y secretos concretos se configuran localmente; no se enviaron correos
  ni se consultó el proveedor comercial.

Instrucciones reproducibles y configuración: [deployment/README.md](../../../database/deployment/README.md).
