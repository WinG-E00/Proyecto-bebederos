# Tareas y Mis tareas

Ruta: `/tasks`.

Listado paginado, filtro por estado y ficha con historial. Cada tarjeta muestra título, descripción, estado, prioridad, responsable, fecha límite, aviso si está vencida y bebedero asociado cuando corresponde.

**Estados:** Pendiente → En progreso → Pendiente de validación → Completada. El rechazo se registra con motivo y requiere revisión del trabajo; no añadir un estado independiente “Rechazada” a la lista actual.

**Dueño:** crear una tarea en un campo seleccionado; ingresar título, descripción, prioridad Baja/Media/Alta, fecha y hora límite, peón responsable y bebedero opcional. Solo se ofrecen responsables asignados a ese campo. Si no hay peones, orientar a Equipo. Puede reasignar tareas no completadas. En pendientes de validación puede aprobar o rechazar; para rechazar debe escribir un motivo.

**Peón:** ve “Mis tareas”; una pendiente permite “Iniciar tarea”, una en progreso permite “Enviar a validación”. No aprueba su propio trabajo.

**Detalle:** historial y comentarios con fecha, actor, estado, creación, inicio, envío, aprobación, rechazo, reasignación o retiro de acceso.

**Cambio concurrente:** si otro usuario modificó la tarea, se consulta el estado actualizado y se solicita “Revisé el estado actualizado” antes de seguir. La interfaz contempla este estado como una situación recuperable.
