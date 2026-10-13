# Verificación de la base compartida — T009–T020

Fecha: 2026-10-13. Alcance: únicamente fase 2. Las historias US1–US9 siguen
pendientes. Se conservaron las versiones de dependencias y el diseño de los paneles.
La checklist de requisitos tiene 16/16 puntos revisados; no se alteró su estado.
No hay `.specify/extensions.yml` ni hooks registrados.

## Resultado por tarea

| Tarea | Implementación y evidencia |
|---|---|
| T009 | `app.js` importable sin conexiones; `server.js` inicia API en loopback, verifica esquema y cierra limpiamente. Retirado `sync({ force: true })`; rutas legacy responden 404 JSON |
| T010 | Umzug con versiones SQL explícitas en `SchemaMigrations`; bloqueo asesor por base; ejecución repetida conserva filas y no reaplica versiones. Registro de modelos compartidos sin importar modelos legacy |
| T011 | Cuentas, campos, asignaciones, invitaciones/campos invitados, tokens y sesiones. Correo único, rol único y relaciones de dueño/peón; invitaciones de siete días y campos del emisor |
| T012 | Recursos, muestras, posiciones, estados y visitas. Claves de fuente únicas, una fila de estado por recurso y visitas del mismo campo/posición única. Triggers conservan mediciones y permiten marcar procesamiento |
| T013 | Tareas/eventos, alertas, notificaciones, historial, correo, clima y salud. Índices y relaciones restrictivas preparadas para las historias posteriores |
| T014 | Errores JSON uniformes, payload Zod estricto y paginación 1/50/máximo 100. Rechazos de JSON inválido, propiedades extra, límites incorrectos y errores sin SQL/stack/secretos |
| T015 | Permisos SQL por cuenta/campo/recurso. Rol leído de MySQL, dueño propietario, peón con asignación vigente, tareas propias y 404 fuera de alcance; retiro/revocación comprobados |
| T016 | Modelo y escritor transaccional de historial. Actor nulo permitido, rollback atómico, bloqueo de cambios/borrados y rechazo de detalles con secretos |
| T017 | Cola cifrada AES-256-GCM vinculada a tokens vigentes, envío SMTP/TLS sustituible, bloqueo de fila, reintentos 1/2/4 minutos y retiro de payload enviado/vencido |
| T018 | Worker independiente cada 5 s, sin solapamiento, parada que espera trabajo activo, exclusión de instancia por base y salud persistente clasificada. Reinicio retoma correo de MySQL |
| T019 | Fetch de mismo origen con cookie y CSRF en memoria; errores del contrato, cancelación de respuestas de sesión anterior, claves de caché por cuenta/campo y limpieza explícita de alcance/cuenta |
| T020 | Carga/error/vacío y confirmación con los componentes existentes; diálogo nativo, foco contenido, Escape, retorno de foco y controles de 44 px verificados en navegador |

## Pruebas ejecutadas

| Comprobación | Resultado |
|---|---|
| `npm test --prefix database` | 40/40 aprobadas (incluyen las 15 de preparación) |
| `npm run test:integration --prefix database` | 15/15 aprobadas en MySQL 8.4 real |
| `npm test --prefix frontend/mi-proyecto-shadcn` | 10/10 aprobadas (incluye el panel original) |
| Playwright, Chromium, 375/768/1280 px | 18/18 aprobadas: paneles, transporte HTTP y confirmación accesible |
| ESLint sobre archivos nuevos/modificados y pruebas del frontend | Aprobado |
| `node --check` backend | Aprobado en los 35 archivos revisados |
| `git diff --check` | Aprobado |

Las pruebas SQL usaron el contenedor `bebederos-phase2-mysql`, MySQL 8.4, puerto
`127.0.0.1:33306`, base `bebederos_phase2_test` y usuario exclusivo `phase2_test`.
Al terminar se detuvo el contenedor y se conservaron sus datos de prueba.
Se comprobaron 23 tablas de dominio más `SchemaMigrations`, claves foráneas sin
cascadas destructivas, restricciones de roles/visitas, aislamiento de dueños,
peón compartido y rechazo de tareas de otro peón. Ninguna prueba usó la base ni
credenciales del `.env` local.

La primera ejecución se interrumpió al crear triggers por la configuración de
binlog. Se ajustó `log_bin_trust_function_creators` exclusivamente en el contenedor
aislado, se retomó la migración y se verificó nuevamente su repetibilidad sin borrar
tablas o registros. El migrador de producción no modifica variables globales.

SMTP fue un proveedor simulado; no se enviaron correos reales. La cola se probó con
dos procesadores concurrentes, fallo repetido, esperas exactas 1/2/4 minutos,
procesador nuevo retomando pendientes y expiración exacta del token. Se verifica
un intento inicial más tres reintentos, conforme a T017. Una aceptación SMTP seguida
de crash antes del commit puede producir reenvío: SMTP y SQL no ofrecen atomicidad
conjunta. No se afirma entrega comprobada ni envío exactamente una vez ante ese crash.

La prueba de procesos inició y cerró una API real sin modificar su esquema y dos
workers secuenciales; rechazó una segunda instancia simultánea. Los ciclos se
verificaron también con reloj controlado, sin esperar cinco segundos reales.
Agua/GPS/alertas no se habilitan como trabajos ficticios: llegan en US3/US4/US7.

## Revisión visual

Los paneles originales no fueron editados. Playwright mantiene los recorridos del
baseline de fase 1. Los componentes compartidos se revisan en una entrada exclusiva
de pruebas (`tests/foundation/index.html`), sin agregar rutas de producto.

| Ancho | Confirmación |
|---|---|
| 375 px | [Captura](screenshots/confirmation-mobile-375.png) |
| 768 px | [Captura](screenshots/confirmation-tablet-768.png) |
| 1280 px | [Captura](screenshots/confirmation-desktop-1280.png) |

La captura móvil se inspeccionó visualmente. Se reutilizan Geist, tarjetas y botones
Base UI/shadcn existentes; no hay rediseño general. Se corrigió el recorrido de Tab
en los extremos del diálogo y se verificaron Escape, retorno al disparador, ancho
sin scroll global y botones de al menos 44 px. Vite deduplica React/ReactDOM y prepara
el botón Base UI para evitar copias inconsistentes al descubrir dependencias.
Los reportes de esta ejecución se guardaron en `/tmp/bebederos-phase2-e2e` para
conservar los dos artefactos que estaban preparados por el usuario en Git.

## Límites de esta entrega

- Build de producto: sigue fallando por la ruta inexistente en `src/App.jsx`,
  registrada en el baseline y asignada a T031.
- Lint global: conserva los cinco errores previos (cuatro imports de `App.jsx` y
  una exportación de constantes de `ui/button.jsx`). Los archivos de esta fase pasan lint.
- No se migró la base local del usuario. Para usar la API/worker hay que completar
  `.env` y ejecutar las migraciones explícitamente en el entorno previsto.
- Sesiones/CSRF de servidor y autenticación se integran en US1. El cliente compartido
  está probado con respuestas controladas del contrato, sin simular esos endpoints
  en la aplicación ni conceder accesos temporales.
- No hay seed del piloto, consultas de historial, correo de alertas, clima ni
  procesamiento de muestras. Los servicios y tablas compartidos quedan listos para
  las historias posteriores.

Comandos y configuración vigentes: [database/deployment/README.md](../../../database/deployment/README.md).
Referencias de implementación: [Umzug](https://github.com/sequelize/umzug) y
[restricciones MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/create-table.html).
