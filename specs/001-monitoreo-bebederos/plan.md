# Implementation Plan: Monitoreo remoto de bebederos — MVP

**Branch**: `develop` (rama Git actual; el directorio de feature se resuelve mediante `.specify/feature.json`) | **Date**: 2026-10-06 | **Spec**: [spec.md](spec.md)

**Input**: Especificación funcional y aclaraciones de `specs/001-monitoreo-bebederos/spec.md`, más decisiones técnicas acordadas con el usuario.

**Estado**: Diseño documentado. No representa código implementado, dependencias instaladas ni verificaciones del producto ejecutadas.

## Summary

Ampliar la aplicación existente para que dueños y peones supervisen establecimientos, agua y animales, administren invitaciones y tareas y consulten alertas, clima e historial. Mantener React, Vite, Tailwind y Node con Express como tecnologías obligatorias; conservar MySQL, Sequelize, mysql2 y las librerías existentes. Usar API REST con sesiones persistentes, autorización por establecimiento, consultas periódicas en la interfaz y un proceso independiente para monitoreo y correo.

Decisiones confirmadas: la base actual contiene solo datos de prueba; SMTP configurable; clima Open-Meteo con modalidad apta para operación comercial; radio inicial de visitas de cinco metros; piloto con 10 campos, 100 bebederos, 1.000 animales y 20 usuarios concurrentes; correos de verificación y recuperación permitidos además de invitaciones, manteniendo alertas operativas internas.

## Technical Context

**Language/Version**: JavaScript con módulos ES y JSX. Node.js 22 como base observada (`22.23.1`). No convertir a TypeScript en este MVP.

**Primary Dependencies**:

| Subsistema | Existentes que se conservan | Adiciones previstas y propósito |
|---|---|---|
| Interfaz | React 19, Vite 8, Tailwind CSS 4, Base UI/shadcn, Lucide, Geist, utilidades y CSS existentes | React Router: rutas; TanStack Query: consultas, caché y actualización periódica |
| Mapa | Leaflet 1.9 y componente existente | Ninguna librería adicional obligatoria; ampliar la integración actual |
| API | Express 5, dotenv, bcrypt | express-session y connect-session-sequelize: sesiones SQL; Zod: validación; Helmet: cabeceras; express-rate-limit: límites |
| Datos | MySQL, Sequelize 6, mysql2 | Umzug: migraciones versionadas |
| Correo | — | Nodemailer: SMTP y TLS |
| Validación | ESLint existente | Vitest, Supertest, React Testing Library, jsdom y Playwright |

Conservar versiones y lockfiles existentes. En implementación, resolver y fijar versiones compatibles de las adiciones en los respectivos lockfiles; comprobar instalación, lint y build sin actualizaciones mayores ajenas al alcance.

**Storage**: MySQL 8; tablas relacionales para recursos, lecturas, posiciones, visitas, tareas, alertas, eventos, sesiones y cola de correo. Fechas persistidas en UTC. Modelos y acceso a datos exclusivamente en `database/`.

**Testing**: Vitest para reglas y componentes; Supertest contra Express con MySQL de pruebas; Playwright para recorridos y comparación visual. Base de pruebas separada; reloj controlable y proveedores SMTP/clima sustituibles en pruebas.

**Target Platform**: Aplicación web responsive en navegadores modernos de escritorio, tablet y teléfono; servidor Node y MySQL. Sin funcionamiento offline ni app nativa.

**Project Type**: Aplicación web con API REST y proceso de trabajo independiente, ambos bajo `database/`.

**Performance Goals**: Consultas automáticas cada 10 segundos en vistas visibles; ciclo de monitoreo cada 5 segundos; al menos 95% de cambios visibles dentro de 30 segundos. Retirar información revocada de vistas abiertas dentro de 30 segundos y denegar nuevas acciones desde la revocación. Medir con la carga piloto acordada, no prometer resultados antes de probar.

**Constraints**: Rol único, aislamiento entre dueños, permisos vigentes por campo, telemetría de solo lectura, historial conservado, identidad visual existente. Sesiones con cookie HttpOnly, SameSite=Lax, Secure en producción y 24 horas de vigencia; protección CSRF; frontend y API bajo el mismo origen. Credenciales fuera del repositorio y del frontend.

**Scale/Scope**: Piloto de 10 establecimientos, 100 bebederos, 1.000 animales y 20 usuarios concurrentes. Todas las prioridades P1–P9 de la especificación integran el MVP. No incorporar sensores, rutas, deshidratación ni notificaciones operativas externas.

## Constitution Check

*GATE: revisión previa y posterior al diseño conforme a la constitución 1.0.0.*

| Principio o regla | Evidencia del diseño | Previo | Posterior |
|---|---|---|---|
| Gestión remota del campo | Monitoreo de agua, GPS y visitas sin inspecciones constantes; consumo de datos disponibles sin integración física | Cumple | Cumple |
| Conservación del diseño | Reutilizar paneles, componentes, estilos, recursos y modo oscuro; registrar ajustes por pantalla; comparación visual antes/después | Cumple | Cumple |
| Separación entre backend y frontend | Modelos, credenciales, API, trabajos y persistencia en `database/`; interfaz y consultas HTTP en `frontend/mi-proyecto-shadcn/` | Cumple | Cumple |
| Áreas afectadas identificadas | Estructura y cambios visuales enumerados a continuación | Cumple | Cumple |
| Validación del intercambio | Contratos REST y escenarios de API/E2E incluidos | Cumple | Cumple |

No se requieren excepciones a la constitución. Sus obligaciones técnicas siguen vigentes y no se trasladan a formularios del usuario.

## Project Structure

### Documentation (this feature)

```text
specs/001-monitoreo-bebederos/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md
│   └── ui.md
└── checklists/requirements.md
```

`tasks.md` corresponde al comando posterior `$speckit-tasks`; no se genera durante esta fase.

### Source Code (repository root)

Estructura prevista para la implementación; no crear estas carpetas en la fase de planificación:

```text
database/
├── app.js
├── db/
├── models/
├── controllers/
├── router/
├── services/
├── middleware/
├── workers/
├── migrations/
├── scripts/
└── tests/
frontend/mi-proyecto-shadcn/
├── src/
│   ├── App.jsx
│   ├── pages/
│   ├── components/
│   ├── services/
│   ├── hooks/
│   └── lib/
└── tests/
```

**Structure Decision**: Extender las carpetas actuales en lugar de reemplazar el proyecto o introducir microservicios. Separar la creación de Express de su arranque para probar API sin iniciar un servidor permanente. Mantener el proceso de monitoreo/correo independiente del servidor HTTP y con estado persistido en MySQL.

Áreas visuales afectadas: acceso y registro; panel dueño; panel peón; navegación y nuevas pantallas; mapa existente. Conservar colores, tipografía, recursos y patrones de tarjetas. Sustituir ejemplos por consultas autorizadas; retirar indicadores de hidratación o supuesta bebida que no pertenecen al MVP. Corregir importaciones inconsistentes al integrar rutas.

## Diseño por subsistema

### Autenticación y autorización

Registro público siempre crea dueño; peón se crea mediante invitación dirigida al correo. Verificación del dueño mediante token de correo; el enlace de invitación verifica el correo del peón sin conceder asignaciones hasta aceptación explícita. Recuperación de contraseña mediante token de 30 minutos; verificación por 24 horas; invitaciones por siete días. Tokens aleatorios de un solo uso, hash almacenado y validación del vencimiento exacto. No confiar en roles enviados por el cliente ni devolver hashes de contraseña.

Sesiones en MySQL; regenerar identificador al iniciar sesión, invalidar al salir y al recuperar contraseña. Leer asignaciones vigentes en cada operación, no congelarlas en una sesión. Solicitudes de escritura exigen token CSRF de sesión. Restringir autenticación y envíos a 30 solicitudes por 15 minutos por IP; límite general inicial de 600 solicitudes/minuto por IP, con revisión durante pruebas de carga. Mostrar errores genéricos para no revelar cuentas existentes.

Frontend y API comparten origen en producción; proxy `/api` de Vite a Express en desarrollo. Configurar HTTPS y proxy de confianza explícito antes del despliegue.

### Persistencia, tareas y conservación

Usar migraciones versionadas con Umzug y Sequelize. Retirar `sync({ force: true })` del arranque durante implementación; no usar `alter` automático en producción. La base actual tiene solo datos de prueba: preparar un esquema limpio mediante un comando separado, con protección de entorno y confirmación antes de eliminar datos. No es obligatorio migrar registros de ejemplo al nuevo modelo.

Cambios de tareas, eventos y notificaciones se confirman en una transacción. Cada tarea tiene `version`; toda acción incluye la versión vista por el usuario. Actualización condicional y bloqueo de transacción impiden sobrescribir cambios; responder 409 y obligar a revisar. Serializar cambios de asignaciones y tareas por campo; revocar acceso y dejar tareas abiertas sin responsable de forma atómica. Las completadas mantienen la atribución histórica.

Aplicar baja lógica a campos, animales y bebederos; conservar hechos y referencias. Consultar historial de campos retirados solo para su dueño. Resolver alertas activas de recursos retirados. No permitir eliminar campos con recursos activos o tareas abiertas ni bebederos con tareas abiertas.

### Monitoreo y visitas

La entrada de datos del MVP son registros de agua y posiciones ya disponibles en MySQL. El proceso revisa registros pendientes cada cinco segundos, en lotes acotados de 500 por recurso, con marcación de procesamiento en la misma transacción de sus efectos. Evitar duplicados mediante claves de fuente y restricciones únicas; ignorar muestras inválidas, futuras o anteriores a la ubicación/lectura actual para efectos actuales y visitas. Conservar muestras válidas originales para consulta histórica aunque lleguen fuera de orden.

Procesar muestras ordenadas por fecha e identificador. Distancia Haversine y radio servidor `VISIT_RADIUS_METERS=5`; seleccionar bebedero más cercano del mismo campo, desempatar por identificador. Primera posición dentro del rango crea visita; permanecer no crea visitas adicionales; salir permite una nueva entrada. La comparación de distancia es inclusiva en cinco metros. Radio inicial sujeto a validación física futura, sin afirmar consumo comprobado.

Alertas y vencimientos se calculan aun sin usuarios conectados. Una condición activa por recurso/tipo; generar y resolver episodios preservando sus eventos. Datos vencen solo cuando superan el límite, 180 minutos predeterminados. Reevaluar inmediatamente al cambiar el límite. Registrar transiciones intermedias de nivel aunque se reciban varias muestras en un lote.

### Actualización de la interfaz

TanStack Query y `fetch`; consultas cada diez segundos para la vista visible, actualización al recuperar conexión/foco e invalidación tras cambios. Incluir cuenta y alcance en claves de caché. Al cambiar permisos, limpiar datos y marcadores retirados; no mostrar caché ajena tras logout/login. Ante error de permisos, retirar el contenido afectado; ante fallo de red, conservar valores identificados como antiguos. El objetivo temporal se valida en vistas activas y conectadas.

### Correo, clima y mapa

Nodemailer con SMTP y TLS. Cola persistida con payload cifrado, intentos y próxima ejecución; máximo tres intentos automáticos con espera de 1, 2 y 4 minutos. Reintento explícito del dueño no extiende la invitación y no duplica asignaciones. Los tokens de validación se guardan como hash; la información necesaria para enviar se cifra en la cola con secreto separado y se retira después del envío. SMTP aceptado significa enviado, no entrega comprobada al buzón.

Consultar Open-Meteo desde backend, temperatura y humedad actuales, código de condición y probabilidad máxima de lluvia del día local, mostrando ese período. Caché SQL por campo de 15 minutos; timeout de cinco segundos; si falla mostrar la última respuesta como antigua o indisponibilidad. Configurar URL y clave de modalidad comercial; no usar el servicio gratuito para la operación comercial acordada. Cambiar ubicación del campo invalida su caché climática.

Ampliar Leaflet existente con marcadores distintos, fichas seleccionables y centrado por campo. Conservar la vista al actualizar posiciones salvo cambio explícito de campo. Teselas OpenStreetMap con atribución y URL configurable, sin precarga/offline; fallo del mapa base deja disponibles fichas y listas.

## Entrega y validación previstas

Orden: autenticación/roles → campos → bebederos → animales/mapa → equipo/invitaciones → tareas → alertas/vigencia → clima → historial y pruebas integrales. El orden es de implementación futura; la aceptación del MVP requiere todas las historias.

Verificar reglas mediante pruebas unitarias, permisos y transacciones contra MySQL de pruebas, componentes y recorridos E2E. Comparar visualmente los paneles existentes y nuevas pantallas en escritorio/tablet/móvil; demostrar los criterios SC de la especificación con la carga piloto.

Antes de operación real: HTTPS, SMTP y clima comercial configurados, API y proceso de trabajo supervisados, migraciones ejecutadas, copia diaria de MySQL y prueba de restauración. Logs estructurados de errores HTTP, duración/atraso de ciclos, fallos SMTP y clima; excluir contraseñas, tokens, payload de correo y credenciales. Registrar estado de salud de API y último ciclo exitoso del proceso. Reinicios deben retomar pendientes sin perder ni duplicar hechos.

## Resultado de planificación

Investigación y decisiones: [research.md](research.md). Modelo: [data-model.md](data-model.md). Contratos: [API](contracts/api.md) e [interfaz](contracts/ui.md). Validación futura: [quickstart.md](quickstart.md).

No quedan decisiones funcionales bloqueantes; proveedores y secretos concretos son configuración de despliegue. No hay archivo `.specify/extensions.yml`, por lo que no se registraron hooks previos ni posteriores.
