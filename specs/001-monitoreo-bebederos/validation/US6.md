# US6 — Asignación y validación de tareas

Implementada y validada el 2026-10-14. T089–T101.

Tareas con prioridad, fecha límite, peón activo y bebedero opcional del mismo campo. Pendiente → En progreso → Pendiente de validación → Completada; rechazo con motivo vuelve a En progreso. Dueño valida/reasigna, peón responsable avanza. Completadas cerradas; vencimiento es informativo. Reasignación conserva estado y responsables anteriores. Revocación deja tareas abiertas sin responsable y exige reasignación antes de validar.

Cada cambio comprueba permisos y `expectedVersion` dentro de una transacción, con bloqueo de campo antes de tarea/asignación. Versiones antiguas responden 409 `STALE_TASK`. Estado, evento, historial y notificaciones internas se confirman juntos; no se envía SMTP por tareas. Frontend obtiene estado actualizado y exige revisión explícita tras conflicto, sin repetir automáticamente la escritura.

## Evidencia

- Seis casos unitarios de transiciones, incluida matriz completa rol/estado/acción y motivo vacío.
- Dos contratos HTTP y cinco casos de integración MySQL: validaciones, aislamiento, dos acciones de igual versión, rechazo/reenvío/aprobación, reasignación, revocación simultánea, validación sin responsable y rollback al fallar la escritura de notificación.
- Regresión conjunta: 81/81 unitarias backend, 108/108 contrato/integración y 21/21 frontend. Prueba de componente/hook verifica nueva versión tras 409 y revisión antes de reenviar; otra verifica limpieza de alcances/agregados sin borrar otra cuenta/campo.
- Playwright `tasks.spec.js`: 3/3 a 375/768/1280 px contra API/MySQL reales. Dueño crea tarea vencida, peón inicia/envía, dueño rechaza con motivo obligatorio, peón ve comentario y reenvía, dueño aprueba y completada ya no permite reasignación. Actualización sin recarga; eventos y notificaciones persistidos. SC-006 demostrado para este recorrido móvil; no se atribuye carga piloto global.
- Capturas: dueño [móvil](screenshots/tasks-owner-mobile-375.png), [tablet](screenshots/tasks-owner-tablet-768.png), [escritorio](screenshots/tasks-owner-desktop-1280.png); peón [móvil](screenshots/tasks-worker-mobile-375.png), [tablet](screenshots/tasks-worker-tablet-768.png), [escritorio](screenshots/tasks-worker-desktop-1280.png). Revisión visual móvil/escritorio: identidad existente, controles principales de 44 px, historial legible y sin scroll horizontal.

Build correcto. Lint de archivos nuevos/modificados sin errores; lint global conserva el error previo `react-refresh/only-export-components` en `src/components/ui/button.jsx:57`. Se conserva como limitación previa, sin modificar el componente ajeno a estas fases. Vite informa el tamaño de bundle mayor a 500 kB; optimización integral corresponde a fases posteriores.

La consulta/marcado de notificaciones y dashboard final pertenecen a US7/US9; esta historia entrega sus registros durables. No se publicaron cambios, no se tocaron datos operativos y no se afirma terminado el MVP completo.
