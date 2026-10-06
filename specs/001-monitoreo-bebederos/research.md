# Investigación y decisiones — Proyecto Bebederos

**Fecha**: 2026-10-06. Documento de diseño; no acredita implementación ni pruebas ejecutadas.

## Contexto observado

El frontend existente utiliza React 19, Vite 8, Tailwind 4, Base UI/shadcn, Geist, Lucide y Leaflet. Está escrito en JavaScript/JSX. El backend utiliza Node, Express 5, Sequelize 6, mysql2, bcrypt y dotenv, y la conexión declara MySQL como dialecto predeterminado. Hay modelos iniciales de usuario, perfil y bebedero y paneles visuales con datos de ejemplo.

El backend arranca actualmente con sincronización destructiva; el login es incompleto y no genera sesión. El frontend tiene importaciones inconsistentes y todavía no conecta los recorridos completos. Estos hallazgos se convierten en trabajo futuro; no corregir código durante `$speckit-plan`.

## R-01 — Mantener el ecosistema existente

**Decision**: React/Vite/Tailwind y Node/Express obligatorios, JavaScript ES/JSX, MySQL/Sequelize/mysql2 existentes. Conservar UI y Leaflet. Node 22 y MySQL 8 como base de ejecución.

**Rationale**: Cumple la instrucción del usuario y la constitución; permite ampliar el proyecto sin migrar el stack ni el diseño.

**Alternatives considered**: Next.js, otro motor de datos, TypeScript o reescritura de paneles descartados por ampliar el alcance. Las librerías nuevas se fijarán en lockfiles durante implementación, conservando versiones actuales salvo incompatibilidad demostrada.

## R-02 — Navegación y consultas

**Decision**: React Router declarativo, TanStack Query y `fetch`. Consultas periódicas cada 10 segundos en la vista visible y actualización al recuperar conexión o foco.

**Rationale**: Aporta rutas por rol y manejo consistente de carga/caché sin exigir otro framework. El objetivo de 30 segundos permite consultas periódicas.

**Alternatives considered**: WebSockets/SSE añaden conexiones persistentes y complejidad innecesaria para el piloto. Redux no es necesario para datos que pertenecen a consultas del servidor.

**Sources**: [React Router](https://reactrouter.com/start/declarative/installation), [TanStack Query polling](https://tanstack.com/query/latest/docs/framework/react/guides/polling).

## R-03 — Identidad y aislamiento

**Decision**: express-session con connect-session-sequelize, cookies protegidas, protección CSRF y permisos consultados por campo en cada solicitud; bcrypt existente para contraseñas. Correo verificado mediante token; invitación verifica el correo de una nueva cuenta peón pero su aceptación explícita concede acceso.

**Rationale**: La persistencia SQL y autorización vigente permiten revocar accesos sin depender de información del navegador. Verificación y recuperación por correo fueron autorizadas expresamente por el usuario.

**Alternatives considered**: JWT guardado en localStorage añade gestión de revocación y exposición del token; sesiones en memoria no son adecuadas para reinicios y operación real.

**Sources**: [Express Session](https://expressjs.com/en/resources/middleware/session/), [Session Store Sequelize](https://github.com/mweibel/connect-session-sequelize).

## R-04 — Persistencia y concurrencia

**Decision**: Migraciones con Umzug, bajas lógicas, claves foráneas, eventos persistentes, transacciones y versión de tarea. Serializar operaciones relacionadas por establecimiento y rechazar versiones antiguas.

**Rationale**: Conserva antecedentes y cumple la decisión de que prevalezca el primer cambio válido. La revocación y las tareas sin asignar se actualizan juntas. La base actual contiene únicamente datos de prueba: no exigir una migración de sus ejemplos al nuevo dominio.

**Alternatives considered**: Sincronización automática destructiva o `alter` en arranque descartados; último cambio sobrescribiendo al anterior contradice la aclaración funcional. Redis no es requerido en el piloto.

**Sources**: [Sequelize migrations](https://sequelize.org/docs/v6/other-topics/migrations/), [Transactions](https://sequelize.org/docs/v6/other-topics/transactions/), [Optimistic locking](https://sequelize.org/docs/v6/other-topics/optimistic-locking/), [Umzug](https://github.com/sequelize/umzug).

## R-05 — Monitoreo independiente y visitas

**Decision**: Proceso separado bajo `database/`, ciclo de cinco segundos, procesamiento transaccional y deduplicado de muestras disponibles. Proximidad mediante Haversine y radio inicial de cinco metros elegido por el usuario; entrada inclusiva, salida/reentrada, selección más cercana y desempate por identificador.

**Rationale**: Alertas e historial deben existir aun sin una pantalla abierta. No se integra hardware; una posición cercana acredita solo una visita estimada.

**Alternatives considered**: Calcular todo en el cliente pierde eventos y depende de sesiones abiertas. Radios de 10 o 20 metros fueron descartados por la elección del usuario. No introducir servicios geoespaciales externos para el piloto.

El radio no garantiza precisión física; contrastarlo con el GPS antes de utilizar estimaciones en campo. Historial consume muestras válidas originales, no únicamente snapshots actuales.

## R-06 — SMTP y correo persistente

**Decision**: Nodemailer con SMTP configurable, TLS, cola SQL cifrada y reintentos acotados. Tokens de invitación de siete días; verificación de 24 horas y recuperación de 30 minutos. Únicamente invitaciones y mensajes de acceso salen de la aplicación.

**Rationale**: SMTP fue elegido por el usuario; la cola permite retomar el envío tras fallos. Mantener el vencimiento evita prolongar invitaciones al reintentar. La aceptación SMTP no prueba entrega final.

**Alternatives considered**: API propietaria de correo innecesaria; envío solo en memoria puede perder mensajes; alertas de agua/GPS/tareas por correo quedan fuera del MVP.

**Sources**: [Nodemailer SMTP](https://nodemailer.com/smtp).

## R-07 — Clima para operación real

**Decision**: Open-Meteo consultado por Express, modalidad comercial configurable. Temperatura, humedad y condición actuales; `daily.precipitation_probability_max` para el día local, etiquetado explícitamente. Caché por campo de 15 minutos, timeout de cinco segundos y fallback antiguo identificado.

**Rationale**: El usuario eligió operación real y clima público. Los términos del servicio gratuito limitan su uso a contextos no comerciales; la operación acordada debe configurar el servicio correspondiente. El período diario coincide con el supuesto funcional de lluvia del día.

**Alternatives considered**: Probabilidad horaria próxima requeriría cambiar el período acordado; consulta desde cada navegador multiplicaría solicitudes. Un proveedor diferente no es necesario mientras Open-Meteo cumpla la disponibilidad requerida.

**Sources**: [Open-Meteo documentación](https://open-meteo.com/en/docs), [condiciones](https://open-meteo.com/en/terms).

## R-08 — Cartografía existente

**Decision**: Mantener la integración directa de Leaflet, marcadores diferenciados y teselas configurables. OpenStreetMap estándar solo dentro de su política de uso, con atribución, caché y sin descargas masivas u offline.

**Rationale**: El proyecto ya dispone del mapa; no necesita otra capa React. Las teselas públicas no ofrecen SLA; permitir sustituir su URL sin cambiar los marcadores autorizados.

**Alternatives considered**: React Leaflet, MapLibre o proveedor propietario no son necesarios para completar los requisitos actuales. Si el piloto excede la política pública, configurar otro proveedor de teselas antes de desplegar.

**Sources**: [Leaflet](https://leafletjs.com/examples/quick-start/), [OpenStreetMap Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/).

## R-09 — Validación y operación

**Decision**: Vitest para reglas/componentes, Supertest con MySQL de pruebas y Playwright para recorridos/visual. Piloto de 10 campos, 100 bebederos, 1.000 animales y 20 usuarios concurrentes. HTTPS, procesos supervisados, registros sin secretos, copias diarias y restauración ensayada antes de operación real.

**Rationale**: Son decisiones de aceptación y despliegue que prueban aislamiento, concurrencia y experiencia móvil. No medir el backend con otro motor que cambie semántica de bloqueos e índices.

**Alternatives considered**: Solo pruebas manuales no verifican regresiones de acceso; SQLite o mocks aislados no prueban comportamiento transaccional MySQL. No incorporar infraestructura distribuida antes de medir el piloto.

## Cierre de incógnitas

Stack, almacenamiento, actualización, identidad, correo, clima, proximidad, carga piloto y estrategia de pruebas quedan definidos. Host, credenciales SMTP, clave comercial, URL pública y proveedor de infraestructura son parámetros de despliegue, no decisiones abiertas del diseño. Todas las adiciones son propuestas para implementación posterior.
