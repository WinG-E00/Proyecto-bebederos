# Interfaces de gestión basadas en Figma Make

Referencia: `implementacion panel establecimientios bebederos animales.make`, entregada para modificar la presentación del frontend. El diseño se extrajo del repositorio incluido en el archivo y se adaptó al contrato real de la aplicación.

## Alcance visual

- `/dashboard`, dueño: resumen operativo, alertas, indicadores con accesos, tareas abiertas y por validar, clima y mapa/lista de ubicaciones. Se conserva el cambio de tema local.
- `/farms`: búsqueda, tarjetas con superficie y recursos, configuración técnica desplegable y formularios en diálogo.
- `/troughs`: resumen de lecturas vigentes y estado operativo, mapa filtrado por tipo, listado desplegable, fichas con nivel, vigencia y ubicación.
- `/animals`: resumen de GPS, mapa filtrado por tipo, listado desplegable y fichas con identificación y visitas estimadas.

Los estilos compartidos de `ManagementUI.css` están acotados a `.management-ui`. Las fuentes DM Sans y Manrope se sirven desde las dependencias locales existentes. La navegación previa se conserva y el panel del peón mantiene su composición.

## Adaptación al comportamiento existente

Los hooks, las rutas, los parámetros `farmId` e `id`, la API y los campos de los formularios se conservan. Especie, raza y estado administrativo siguen siendo editables como antes; la posición GPS del animal sigue siendo de consulta. Las operaciones disponibles siguen dependiendo del rol. Las eliminaciones mantienen la confirmación, las restricciones del servidor y la conservación de antecedentes.

Los datos ilustrativos del prototipo se sustituyen por respuestas de la API. Los mapas utilizan Leaflet y las coordenadas recibidas, con lista alternativa si falla el mapa base. Los resúmenes de animales y bebederos se calculan sobre la página cargada; cuando hay más registros, la interfaz identifica ese alcance. El promedio de agua utiliza exclusivamente lecturas vigentes y muestra un guion cuando no existen, evitando representar falta de datos como 0%.

Las fichas siguen accesibles al entrar a la pantalla: los listados comienzan abiertos y se pueden plegar. Los antecedentes se consultan a demanda. Las tareas y el clima del panel del dueño se presentan directamente para seguir la composición de la referencia.

## Verificación

- `npm run build`, `npm run lint` y `npm test`.
- `npx playwright test management-design.spec.js navigation.spec.js panel-disclosures.spec.js`.
- Las pruebas de diseño usan respuestas controladas de API para verificar los tres tamaños configurados (375, 768 y 1280 px), permisos, formularios, parámetros enviados, errores de eliminación, búsqueda, mapas por tipo, paginación y tema. No sustituyen una prueba de integración contra el backend.
- Las capturas se generan en `test-results/` para la revisión visual; las teselas se sustituyen por una imagen vacía en las pruebas para evitar dependencia de proveedores externos.
