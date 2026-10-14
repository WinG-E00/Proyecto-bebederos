# US5 — Equipo e invitaciones

Implementada y validada el 2026-10-14. T076–T088.

Invitaciones emitidas por dueño, campos propios, token aleatorio guardado como hash, enlace en cola cifrada y siete días exactos UTC. Envío separado de aceptación; reintento de fallo sin prolongar el plazo ni cambiar token. Retiro y worker cancelan payloads. Límites de envío: 30/15 minutos por IP. SMTP real no se utilizó.

Equipo único por dueño, selección múltiple y confirmación de retirada. Reemplazo de asignaciones bloquea campos en orden, conserva otros dueños y deja tareas abiertas sin responsable con versión/eventos; conserva estado de validación y atribución de completadas. Aceptación repetida no reactiva una revocación. La API consulta permisos vigentes; la interfaz limpia caché de campos retirados y agregados, y consulta cada diez segundos.

## Evidencia

- Dos contratos HTTP, tres casos de integración de invitaciones y uno de revocación: aislamiento, cuenta dueño incompatible, destinatario/campos, múltiples dueños, vencimiento exacto, fallo SMTP simulado y reintento, retiro, campo retirado, estados y versiones de tareas fixture.
- Regresión conjunta: 81 pruebas unitarias backend, 108 de contrato/integración y 21 frontend; casos adicionales documentados en US6. Se corrigieron fixtures de fechas UTC y preparación de correos sintéticos para que la base histórica de pruebas sea reutilizable.
- Playwright `team.spec.js`: 3/3 en 375/768/1280 px. Emisión real desde UI, enlace capturado desde cola cifrada, registro/login peón, aceptación explícita, consulta de campos y revocación en una pantalla abierta sin recarga (espera máxima de 30 s). Accesos de otros dueños y denegación inmediata se verifican en API.
- Capturas revisadas: [móvil](screenshots/team-mobile-375.png), [tablet](screenshots/team-tablet-768.png), [escritorio](screenshots/team-desktop-1280.png). Se conserva Geist, navegación verde, tarjetas y confirmación compartida. No hay scroll horizontal.

MySQL 8.4.11 en contenedor aislado; bases de integración y E2E separadas. No se migró la base operativa ni se enviaron mensajes externos. La prueba temporal cubre pantallas activas y conectadas del recorrido; la carga piloto integral corresponde al cierre posterior del MVP.
