# Guía de puesta en marcha y validación prevista

**Estado actualizado (2026-10-13)**: T001–T020 implementadas; comandos actuales y configuración en [database/deployment/README.md](../../database/deployment/README.md), evidencia de preparación en [validation/baseline.md](validation/baseline.md) y base compartida en [validation/foundational.md](validation/foundational.md). Las secciones «previstas» siguientes conservan el plan de aceptación del MVP completo; autenticación, rutas de negocio, seed y monitoreo de agua/GPS todavía requieren las historias posteriores.

## Requisitos del entorno futuro

- Node.js 22 compatible con Vite existente y npm.
- MySQL 8 con bases separadas de desarrollo y pruebas y usuario con privilegios limitados a ellas.
- SMTP configurable para invitaciones, verificación y recuperación; en pruebas, buzón de captura local o adaptador simulado, sin enviar mensajes reales.
- Credenciales Open-Meteo aptas para uso comercial antes de operar campos reales. En pruebas usar respuestas controladas.
- Navegadores Playwright instalados para E2E.

La base actual tiene datos de ejemplo. Antes de aplicar migraciones confirmar que se apunta al entorno previsto. El arranque nuevo ya no usa `sync({ force: true })`; únicamente verifica el esquema. La fase 2 se comprobó en una base MySQL aislada y no migró la base del `.env` local.

## Configuración a documentar en implementación

Crear ejemplos sin secretos y archivos locales ignorados por Git. Backend:

| Parámetro | Propósito |
|---|---|
| NODE_ENV, PORT | Entorno y puerto de API; desarrollo en 3000 |
| DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD | Conexión MySQL; base de pruebas separada |
| SESSION_SECRET | Secreto aleatorio de al menos 32 bytes para sesiones |
| OUTBOX_SECRET | Secreto separado para cifrar la cola de correo |
| APP_URL | URL pública usada en enlaces; desarrollo `http://localhost:5173` |
| VISIT_RADIUS_METERS | Radio inicial 5 metros |
| SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM | Correo; TLS según puerto/proveedor |
| WEATHER_URL, WEATHER_API_KEY | Endpoint y credencial comerciales de clima |
| MAP_TILE_URL | Fuente de teselas configurable en interfaz; ninguna clave secreta al navegador |
| TRUST_PROXY | Activar solo según proxy real y documentado |
| DEMO_PASSWORD | Contraseña de cuentas de prueba, nunca producción |

Vite utilizará proxy `/api` a Express. En producción frontend y API compartirán origen HTTPS; archivos estáticos tendrán fallback a la SPA para rutas públicas y protegidas, sin ocultar errores de `/api`.

## Instalación y ejecución después de implementar

Ejecutar desde la raíz. `npm ci` instala dependencias según lockfiles que la implementación generará; no ejecutar esta sección para aplicar únicamente documentos.

```bash
npm ci --prefix database
npm ci --prefix frontend/mi-proyecto-shadcn
```

Comandos previstos para migrar y cargar ejemplos, sin reiniciar tablas al arrancar:

```bash
npm run migrate --prefix database
npm run seed --prefix database
```

En terminales separadas:

```bash
npm run dev --prefix database
npm run worker --prefix database
npm run dev --prefix frontend/mi-proyecto-shadcn
```

El proceso worker debe registrar su último ciclo exitoso y retomar pendientes tras reinicio. El seed preparará dos dueños, un peón compartido, campos asignados y no asignados, bebederos, animales, tareas y lecturas fronterizas. Cuentas identificadas como prueba, con contraseña configurada; no introducir datos ficticios silenciosamente en producción.

## Verificación automática prevista

Los scripts siguientes se agregarán en implementación; no existen todavía por esta planificación:

```bash
npm test --prefix database
npm run test:integration --prefix database
npm test --prefix frontend/mi-proyecto-shadcn
npm run lint --prefix frontend/mi-proyecto-shadcn
npm run build --prefix frontend/mi-proyecto-shadcn
npm run test:e2e --prefix frontend/mi-proyecto-shadcn
```

Separar pruebas unitarias de integración; integración exige MySQL de pruebas y migraciones, nunca la base operativa. Controlar fecha/hora sin esperar tres horas reales; correo, clima y teselas sustituibles en pruebas de fallos.

## Escenarios de aceptación

| Escenario | Pasos | Resultado verificable |
|---|---|---|
| Cuenta dueño | Registro público, verificación por enlace y login | Rol único dueño; sesión protegida; perfil no permite cambiar rol |
| Invitación | Invitar a correo en dos campos, crear/iniciar cuenta peón, aceptar | Correo SMTP y acceso solo tras aceptación; repetir no duplica |
| Vencimiento | Antes y exactamente a siete días; retirar otra invitación | Exactamente al plazo no acepta; retiro no concede acceso |
| Varios dueños | Peón acepta invitaciones de dos dueños | Acumula accesos; cada dueño ve solo sus datos |
| Aislamiento | Acceso directo a campo/animal/tarea/mapa ajeno | Denegación sin detalles; conteos autorizados correctos |
| Revocación | Dejar tareas abiertas y quitar campo sin otro peón disponible | Acceso retirado inmediatamente; tareas sin responsable, estado/historial conservados; otros dueños intactos |
| Agua | Muestras 0, 19, 20, 50, 51, 100 y valores inválidos | Categorías exactas; inválido no sustituye valor válido; nivel no editable |
| Automatismo | Incorporar lectura/posición desde fixture/comando de desarrollo con vista abierta | Cambio visible sin recarga en ≤30 s; worker procesa aun sin usuarios |
| Vigencia | Antes, al cumplirse y después del límite; cambiar límite de un campo | Vence solo después; alerta/fecha visibles; otros campos intactos |
| GPS y visita | Fuera, exactamente 5 m, dentro repetido, salida/reentrada, rangos superpuestos | Una visita por entrada; más cercano/id; mismo campo; nunca afirmar que bebió |
| Tareas | Crear, iniciar, enviar, rechazar con motivo, reenviar, aprobar | Flujo definido y notificaciones internas; motivo requerido |
| Concurrencia | Dos acciones con igual versión y una revocación simultánea | Primer cambio válido; segunda acción 409; no escribir con acceso retirado |
| Historial | Consultar cinco tipos, retirar recursos y revocar acceso | Fechas/referencias conservadas para dueño; peón revocado no accede |
| Clima y teselas | Consultar clima real configurado y simular fallos | Cuatro datos o indisponibilidad; período diario visible; listas funcionan sin mapa base |
| Correo fallido | SMTP falla, reiniciar worker, reintentar invitación | Pendiente/fallido visible; no concede acceso; no extiende siete días |
| Pantallas | Recorridos a 375, 768 y 1280 px; teclado y modo oscuro | Sin scroll global horizontal; controles utilizables; diseño existente reconocible |
| Recuperación | Cambiar contraseña mediante enlace y reutilizarlo | Token de un uso; sesiones antiguas invalidadas |

Referencia de payloads y errores: [contracts/api.md](contracts/api.md). Entidades y estados: [data-model.md](data-model.md). Presentación: [contracts/ui.md](contracts/ui.md).

## Carga piloto y puesta en operación

Preparar 10 campos, 100 bebederos, 1.000 animales y 20 usuarios concurrentes con cuentas y accesos variados. Medir cambios visibles, atraso del worker, errores y duplicados durante entrada de muestras, consultas y acciones. Aceptar SC-003 solo si al menos 95% de cambios se refleja en ≤30 segundos, y comprobar los restantes SC con pruebas funcionales y usuarios de prueba.

Antes de publicar: servicios de correo/clima operativos, teselas dentro de política, HTTPS y cookie Secure, procesos supervisados, migraciones sin sincronización destructiva, copia diaria y ensayo de restauración. Logs sin contraseñas/tokens; monitorizar último ciclo, errores SMTP/clima y solicitudes fallidas. Ninguna contratación, envío de correo real o despliegue se realiza en esta fase documental.

## Implementado en fases 4–6

Con una sesión verificada, usar `/farms`, `/troughs`, `/animals` y `/map`. Seleccionar campo para dar de alta recursos. Peones consultan sus campos asignados; la gestión de invitaciones de US5 sigue pendiente.

La herramienta de muestras requiere `NODE_ENV=development` o `test` y la configuración de backend del entorno elegido. El JSON usa id numérico de recurso existente y fecha UTC de la fuente. Una clave repetida con los mismos datos es idempotente; reutilizarla con otros valores se rechaza. No ejecutarla contra producción.

```bash
npm run sample --prefix database -- water '{"sourceKey":"pilot-water-001","resourceId":1,"percentage":19,"measuredAt":"2026-10-14T03:00:00.000Z"}'
npm run sample --prefix database -- animalPosition '{"sourceKey":"pilot-gps-001","resourceId":1,"latitude":-26,"longitude":-59,"measuredAt":"2026-10-14T03:00:00.000Z"}'
npm run sample --prefix database -- troughPosition '{"sourceKey":"pilot-trough-gps-001","resourceId":1,"latitude":-26,"longitude":-59,"measuredAt":"2026-10-14T03:00:00.000Z"}'
npm run worker --prefix database
```

El worker procesa agua/GPS cada cinco segundos y la interfaz consulta cada diez segundos en vistas visibles. Las muestras futuras se marcan sin actualizar datos actuales; las antiguas válidas quedan en historial. Las alertas de episodios y la consulta de historial se completan en US7/US9. La clave SMTP sigue opcional para estas verificaciones; no se envían correos reales. El mapa usa `VITE_TILE_URL` opcional y mantiene lista/fichas si fallan las teselas.

Para repetir recorridos de las fases 4–6 usar `E2E_FULLSTACK=1` y las variables `E2E_DB_*`/`E2E_OUTBOX_SECRET` del apartado US1, con API y MySQL exclusivos de pruebas.

## Fases 6–8 implementadas (2026-10-14)

Animales/GPS/visitas/mapa, Equipo/invitaciones y Tareas ya están integrados en `/animals`, `/map`, `/team` (dueño) y `/tasks` (vista según rol). Aplican las tres migraciones existentes; estas fases no requieren recrear tablas. La API recibe la misma cola cifrada que identidad y el worker incorpora vencimiento de invitaciones. Configurar `APP_URL`, `OUTBOX_SECRET` y SMTP para envíos reales. Las pruebas capturan el enlace desde la cola y simulan el proveedor; no requieren enviar correo real.

Para pruebas repetibles usar `database/.env.test` conforme al ejemplo y MySQL 8, con base/usuario exclusivos. Si MySQL tiene binlog habilitado, el administrador del servidor debe permitir la creación de los triggers de inmutabilidad al migrar; en el contenedor de pruebas se habilitó `log_bin_trust_function_creators`. No conceder privilegios globales al usuario de aplicación como sustituto.

E2E requiere API real en 3000 y Vite en 5173, `E2E_FULLSTACK=1`, `E2E_DB_HOST/PORT/NAME/USER/PASSWORD` y `E2E_OUTBOX_SECRET` coincidentes con la API. Usar una base E2E separada de integración, con nombre terminado en `_e2e` o `_test`, para que los casos de cola no interfieran con el registro del navegador. Las variables `DB_*` de la API de pruebas deben apuntar a esa misma base aislada. Conservar los límites productivos por defecto; las ejecuciones repetidas de identidad pueden alcanzar 30 solicitudes por 15 minutos por IP.

Evidencias: [US4](validation/US4.md), [US5](validation/US5.md), [US6](validation/US6.md). El MVP aún requiere las fases 9–12.
