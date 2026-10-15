# US9 — Historial y dashboards

Implementada y validada el 2026-10-14. T121–T132.

Historial global (`GET /api/v1/history`) y por ficha (`/troughs/:id/history`, `/animals/:id/history`) con filtros de campo, tipo y período, paginación y fecha en la zona del campo. Cinco tipos requeridos: agua, posiciones GPS, visitas estimadas, alertas y tareas (más bajas administrativas). El dueño conserva antecedentes de recursos y campos retirados; el peón ve solo sus tareas en el historial global y antecedentes de fichas de campos asignados vigentes; al revocarse la asignación pierde el acceso (404). Muestras válidas fuera de orden se conservan como `historical`. Los eventos de tarea guardan responsable humano y responsables anterior/nuevo.

Dashboard (`GET /api/v1/dashboard`, `farmId` opcional): campos, animales y bebederos activos, personas únicas (un peón en dos campos cuenta una vez; `null` para el peón), agua Baja/Crítica/sin medición, alertas activas, tareas no completadas por estado (el peón solo las propias) y mapa autorizado. No cuenta datos de terceros.

Paneles existentes conectados a datos reales: `InterfazDuenio` (estado, totales, alertas y actividad de tareas, clima y mapa) e `InterfazPeon` (bebederos/ganado activos, alertas, estado según Bajo/Crítico, tareas, clima y mapa). Se retiraron los datos de ejemplo de hidratación/tiempo bebiendo (`datosEjemplo.js`); el ganado es el censo activo, no caravanas inferidas. Navegación por rol: Historial y Equipo solo para el dueño.

## Evidencia

- Contrato `history.test.js` y `dashboard.test.js`; integración `history-dashboard.test.js` (3 casos) contra MySQL de pruebas: cinco tipos, actor, filtros, fuera de orden, peón con tareas propias, reasignación, retiro, revocación y agregados exactos dueño/peón compartido.
- Regresión backend: 85/85 unitarias y 121/121 contrato/integración (MySQL 8.3 temporal y exclusivo de pruebas, puerto 3310; no se usó la base operativa).
- Frontend: 21/21 pruebas de componentes (se ajustó `auth.test.jsx` para simular el resumen que ahora espera el panel), ESLint sin errores y build correcto.
- Playwright `history-dashboard.spec.js`: 3/3 a 375/768/1280 px contra API/MySQL reales (Edge). Dashboard de dueño y peón con totales reales, clima, mapa; historial filtrado por los cinco tipos; peón sin enlace a Historial; antecedentes de ficha de animal; revocación y retiro sin recarga. Sin scroll horizontal.
- Capturas: dueño [móvil](screenshots/dashboard-owner-mobile-375.png), [tablet](screenshots/dashboard-owner-tablet-768.png), [escritorio](screenshots/dashboard-owner-desktop-1280.png); peón [móvil](screenshots/dashboard-worker-mobile-375.png), [tablet](screenshots/dashboard-worker-tablet-768.png), [escritorio](screenshots/dashboard-worker-desktop-1280.png); historial [móvil](screenshots/history-mobile-375.png), [tablet](screenshots/history-tablet-768.png), [escritorio](screenshots/history-desktop-1280.png).

SC-008 (dashboard con totales, alertas, tareas, clima y mapa) y SC-009 (antecedentes por tipo y período) demostrados para estos recorridos. La carga global (SC-003) y la evaluación con usuarios (SC-001/005/006/010) quedan para la fase 12.
