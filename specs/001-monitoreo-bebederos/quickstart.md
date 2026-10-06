# Guía de puesta en marcha y validación prevista

**Importante**: Esta fase genera solo documentos. No se instalaron dependencias del plan ni se implementaron sus comandos/rutas. Los comandos marcados como «previstos» deberán existir después de ejecutar las tareas de implementación. Esta guía no afirma que el MVP ya funcione.

## Requisitos del entorno futuro

- Node.js 22 compatible con Vite existente y npm.
- MySQL 8 con bases separadas de desarrollo y pruebas y usuario con privilegios limitados a ellas.
- SMTP configurable para invitaciones, verificación y recuperación; en pruebas, buzón de captura local o adaptador simulado, sin enviar mensajes reales.
- Credenciales Open-Meteo aptas para uso comercial antes de operar campos reales. En pruebas usar respuestas controladas.
- Navegadores Playwright instalados para E2E.

La base actual tiene datos de ejemplo. Antes de cambiarla confirmar que sigue siendo desarrollo/pruebas. El arranque existente usa `sync({ force: true })`; su sustitución está prevista como primera corrección de persistencia. No arrancar ese backend contra una base que se necesite conservar.

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
