# US8 — Clima por establecimiento

Implementada y validada el 2026-10-14. T113–T120.

Adaptador Open-Meteo comercial en backend: temperatura/humedad/código actuales y máxima probabilidad de precipitación del día local. Epoch UTC evita ambigüedad de fechas; período diario, zona, referencia temporal, fuente y modelo visibles. Caché SQL de 15 minutos por campo y ubicación/zona, consolidación de consultas concurrentes en la API, timeout de cinco segundos, fallback antiguo o ausencia sin ceros ficticios. Cambio de ubicación/zona invalida; respuesta en vuelo no repuebla ubicación anterior. Acceso se comprueba nuevamente tras esperar al proveedor.

Validación: 2 pruebas unitarias, 4 de contrato/integración MySQL. Contrato ejecutado primero con 404 esperado. Verifica día local, cero real, datos incompletos, timeout, caché al límite exacto, aislamiento, revocación y cambio concurrente de ubicación. Proveedor simulado, sin consultas comerciales ni secretos expuestos.

Playwright con API/MySQL reales: 3/3 a 375/768/1280 px; dos campos con valores independientes, período, datos antiguos y ausencia tras invalidación. Capturas `screenshots/weather-{mobile-375,tablet-768,desktop-1280}.png`, sin scroll horizontal. Tarjetas y navegación conservan la identidad existente. Build correcto; 85/85 pruebas unitarias backend en esta etapa.

Operación real requiere `WEATHER_API_KEY` y `WEATHER_URL` comercial (predeterminada `https://customer-api.open-meteo.com/v1/forecast`). Sin clave se devuelve indisponibilidad, sin recurrir al servicio gratuito. No se contrató ni configuró un servicio externo. Parámetros contrastados con [documentación oficial](https://open-meteo.com/en/docs).
