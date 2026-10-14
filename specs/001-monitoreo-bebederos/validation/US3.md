# US3 — Bebederos y agua

T046–T059 implementadas y verificadas el 2026-10-14. MySQL 8.4.11 exclusivo de pruebas.

- 11 pruebas unitarias de categorías, ausencia, límite estricto de antigüedad y orden fecha/id.
- 9 casos de contrato y 3 de integración: claves deduplicadas, límites de agua, procesamiento concurrente/reinicio, históricas/futuras, GPS de dispositivo, bloqueo por tarea abierta y conservación tras baja. Con US2, 24/24 casos pasan.
- Playwright `troughs.spec.js`: 3/3 en 375/768/1280 px contra API/MySQL reales. Agua actualizada sin recarga, categoría/fecha, ausencia, rechazo de payload de nivel, confirmación y baja. Sin desbordamiento horizontal.

Worker de agua integrado en el ciclo de 5 segundos. Lotes de 500 por recurso, bloqueo campo/recurso, eventos y marcación atómicos. Fuente UTC normalizada al escribir SQL, independiente de la zona horaria local. Muestras inválidas se rechazan antes de persistir por validación y CHECK; futuras se marcan sin efectos actuales. `scripts/sample.js` exige development/test, no hay API de telemetría.

Consultas de interfaz cada 10 segundos solo en vista visible, reconexión/foco; errores de acceso ocultan contenido y de red conservan datos señalados como antiguos. Las alertas y dashboards finales corresponden a US7/US9.
