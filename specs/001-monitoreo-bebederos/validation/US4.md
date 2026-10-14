# US4 — Animales, GPS, visitas y mapa

Validada el 2026-10-14 con MySQL 8.4.11 exclusivo de pruebas (contenedor `bebederos-phases678-test`, puerto 33368). Se conservó y revisó la implementación presente en el árbol de trabajo.

- Backend: 75/75 unitarias y 95/95 de contrato/integración del conjunto US1–US4. US4 incluye 3 casos de proximidad, 9 de contrato animales/mapa y 3 de procesamiento/visitas: límite inclusivo, más cercano/id, permanencia/reentrada, claves repetidas, workers concurrentes y reinicio, muestras históricas/futuras, baja y aislamiento.
- Playwright `animals-map.spec.js`: 3/3 en 375, 768 y 1280 px. Alta/edición/baja, GPS y visita actualizados sin recarga, ficha desde marcador, zoom/pan conservados, teselas fallidas y lista alternativa, sin scroll horizontal. Capturas: [móvil](screenshots/animals-map-mobile-375.png), [tablet](screenshots/animals-map-tablet-768.png), [escritorio](screenshots/animals-map-desktop-1280.png).
- Revisión visual móvil: navegación verde y tarjetas existentes, controles táctiles, marcadores con tipo y nombre; alternativa textual utilizable al fallar teselas. Sin rediseño general.
- Frontend: 19/19 pruebas y build correctos. Lint conserva el error previo de exportación de `buttonVariants` en `ui/button.jsx`, ajeno a esta historia.

No se enviaron correos reales ni se modificó la base operativa. La estimación por proximidad no acredita consumo ni precisión física del GPS. SC-007 se verifica para los escenarios controlados de esta historia; el piloto integral pertenece a las fases posteriores.
