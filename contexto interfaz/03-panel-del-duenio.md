# Panel del dueño

Ruta: `/dashboard · rol dueño`.

**Objetivo:** entender dónde intervenir y acceder a la gestión.

Contenido real del panel conectado:

1. Encabezado “Panel del campo”, resumen general y control de tema local.
2. “Necesita atención”: cantidad de alertas activas, bebederos con agua crítica, baja o sin medición, y hasta tres mensajes de alerta.
3. “Tareas y actividad”: abiertas, pendientes, en progreso, por validar; muestra hasta cinco tareas con responsable y enlace al módulo.
4. “Recursos del campo”: cantidades de bebederos, animales y establecimientos, con accesos.
5. Clima compacto del campo; si hay varios, selector interno para consultar uno.
6. Ubicaciones: mapa compacto o lista con búsqueda por nombre, filtro por tipo y acceso a fichas.

El código utiliza secciones desplegables para organizar parte del contenido. Estas secciones empiezan cerradas y se abren o cierran con el encabezado. El contenido interior se monta cuando se abre la sección.
