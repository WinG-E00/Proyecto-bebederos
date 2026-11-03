# Clima

Ruta: `/weather`.

Una tarjeta por establecimiento autorizado, o solo la del seleccionado. Datos: nombre del campo, temperatura en °C, condición, humedad, probabilidad de lluvia, período de referencia de la máxima diaria de esa probabilidad, zona horaria, fecha de referencia, fecha de consulta, fuente y modelo.

En la tarjeta compacta del panel se reduce a temperatura, condición, probabilidad de lluvia y actualización. No hay pronóstico semanal en la interfaz actual.

La interfaz contempla carga, error con reintento, información no disponible y datos antiguos. La antigüedad debe resultar visible incluso cuando se conserva una tarjeta con datos anteriores.
