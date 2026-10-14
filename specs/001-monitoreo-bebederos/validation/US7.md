# US7 — Alertas y vigencia

Implementada y validada el 2026-10-14. T102–T112.

Episodios de agua Bajo/Crítico y ausencia/antigüedad de agua y GPS animal. Procesamiento transaccional por muestra, bloqueo por campo y clave activa única. Conserva transiciones intermedias, resuelve recuperación y baja; nivel y antigüedad coexisten. El worker evalúa tiempo sin usuarios conectados. Cambiar el límite reevalúa dentro de la transacción de configuración. Lectura de mensajes no resuelve condiciones físicas.

Evidencia: 2 casos unitarios; 4 casos de contrato/integración MySQL con múltiples workers, reinicio, lote Bajo→Crítico→Normal, límite exacto de 180 minutos, recuperación independiente, ausencia, retiro y acceso revocado. El contrato se ejecutó antes de implementar y falló por 404 de la ruta faltante tras iniciar MySQL de pruebas. Regresión frontend: 21/21 pruebas.

Playwright: 3/3 recorridos contra API/MySQL reales a 375/768/1280 px. Ausencia, alertas actualizadas sin recarga, resolución histórica y valor antiguo visible en ficha; sin scroll horizontal. Capturas en `screenshots/alerts-{mobile-375,tablet-768,desktop-1280}.png`. Conserva navegación verde, tarjetas y tipografía existentes. No se atribuye la prueba de carga global SC-003 (fase 12).
