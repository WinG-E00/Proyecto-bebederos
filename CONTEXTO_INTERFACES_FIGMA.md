# Proyecto Bebederos — Contexto de interfaces para Figma

Documento para copiar en Figma AI/Make o compartir con quien diseñe la aplicación. Basado en las rutas y componentes del frontend revisados el 20/10/2026. Describe la implementación del código; no es una auditoría visual del sitio ejecutado. Las recomendaciones de diseño se identifican como propuestas.

## 1. Instrucción para Figma

Actuá como diseñador de producto y rediseñá las interfaces de Proyecto Bebederos usando este documento como contexto funcional. Es una aplicación web de monitoreo ganadero y gestión de establecimientos rurales. Busco una interfaz clara, coherente, moderna y fácil de usar tanto en computadora como en celular.

Conservá las funciones, los datos, los permisos y los flujos descritos. Podés reorganizar la navegación, la jerarquía, los componentes y la presentación. Diferenciá la experiencia del dueño de la del peón. El dueño administra; el peón consulta los campos autorizados y ejecuta sus tareas. No agregues funciones de negocio sin marcarlas como propuestas.

Priorizá identificar problemas de agua, entender si las mediciones son recientes, localizar animales y bebederos, y resolver tareas. Diseñá también estados vacíos, carga, errores, pérdida de conexión y confirmaciones. Usá español de Argentina, con textos como “Seleccioná”, “Guardá” e “Iniciá sesión”.

Primero proponé la arquitectura de navegación y un sistema de componentes. Después diseñá las pantallas por módulos y conectá los flujos principales. No conviertas cada sección del dashboard en una página nueva ni elimines los detalles necesarios para operar.

## 2. Producto y conceptos

**Nombre actual:** Proyecto Bebederos. También aparece el descriptor “Monitoreo Ganadero”.

**Objetivo:** reunir el estado de los puntos de agua, las ubicaciones del ganado, las alertas y el trabajo del personal en uno o varios establecimientos.

| Concepto | Significado en la interfaz |
| --- | --- |
| Establecimiento / campo | Unidad que agrupa animales, bebederos, tareas y accesos del equipo. |
| Bebedero | Punto de agua con capacidad, estado operativo, ubicación y mediciones de nivel. |
| Animal | Registro individual con especie, raza, edad, estado administrativo y posición GPS cuando existe. |
| Telemetría | Mediciones recibidas; puede faltar o estar desactualizada. |
| Visita estimada | Proximidad de un animal a un bebedero. No demuestra consumo de agua. |
| Tarea | Trabajo asignado a un peón, con prioridad, vencimiento y validación del dueño. |
| Alerta | Condición detectada sobre agua o GPS, activa o resuelta. |
| Notificación | Mensaje de actividad de tareas, con estado de lectura. |
| Antecedentes | Registro histórico que se conserva incluso ante bajas administrativas. |

El selector de establecimiento define el alcance de las consultas. “Todos los establecimientos” significa todos los autorizados para la cuenta. Para crear animales, bebederos o tareas se debe elegir un establecimiento concreto. La navegación conserva ese contexto mediante `farmId`.

## 3. Usuarios y permisos

| Capacidad | Dueño | Peón |
| --- | --- | --- |
| Consultar panel, recursos, mapa, clima y alertas | Sí, sobre sus campos | Sí, sobre campos asignados |
| Crear, editar y retirar establecimientos | Sí | No |
| Crear, editar y retirar animales | Sí | No |
| Crear y retirar bebederos | Sí | No |
| Crear tareas y asignar responsables | Sí | No |
| Iniciar una tarea y enviarla a validación | No es la acción de su interfaz | Sí, en sus tareas |
| Aprobar, rechazar y reasignar tareas abiertas | Sí | No |
| Administrar equipo e invitaciones | Sí | No |
| Consultar historial general | Sí | No |
| Consultar antecedentes desde fichas de animales y bebederos | Control disponible en la interfaz | Control disponible en la interfaz, sujeto al acceso al recurso |
| Editar nombre del perfil y cerrar sesión | Sí | Sí |

El registro público crea una cuenta de dueño. El peón se incorpora mediante una invitación enviada por un dueño. No debe existir un selector de rol que permita obtener permisos administrativos. Un peón puede recibir accesos de distintos dueños.

## 4. Inventario de pantallas y rutas activas

| Ruta | Pantalla | Acceso |
| --- | --- | --- |
| `/login` | Inicio de sesión | Sin sesión; con sesión redirige al panel |
| `/register` | Registro de dueño | Sin sesión; con sesión redirige al panel |
| `/verify` | Verificación de correo | Mediante enlace |
| `/forgot` | Recuperación de acceso | Formulario de correo |
| `/reset` | Nueva contraseña | Mediante enlace |
| `/invite` | Invitación y acceso del peón | Enlace; contempla registro o sesión existente |
| `/dashboard` | Panel, variante dueño o peón | Sesión iniciada |
| `/farms` | Establecimientos | Ambos roles, con acciones distintas |
| `/troughs` | Bebederos y ficha individual | Ambos roles, con acciones distintas |
| `/animals` | Animales y ficha individual | Ambos roles, con acciones distintas |
| `/map` | Mapa de recursos | Ambos roles |
| `/tasks` | Tareas / Mis tareas | Ambos roles, con acciones distintas |
| `/team` | Equipo e invitaciones | Dueño |
| `/alerts` | Alertas y notificaciones | Ambos roles |
| `/weather` | Clima por establecimiento | Ambos roles |
| `/history` | Historial general | Dueño |
| `/profile` | Mi perfil | Ambos roles |

`/` redirige a `/dashboard`; sin sesión se requiere acceso. `/registro` es un alias de `/register`. Las rutas desconocidas redirigen al inicio: no existe una pantalla 404 dedicada.

Las fichas individuales de animales, bebederos y tareas se abren mediante `?id=…`, normalmente junto con `farmId`. No hay una ruta independiente de detalle por cada recurso.

## 5. Acceso y cuenta

### Inicio de sesión

- Logo, enlaces a iniciar sesión y registrarse, formulario central y pie de marca.
- Correo y contraseña; control para mostrar u ocultar la contraseña.
- Acción principal “Iniciar sesión”; estado “Ingresando…”.
- Accesos a recuperar contraseña y registro.
- Errores de credenciales, conexión, límite de intentos y correo no verificado.
- Si falta verificar el correo, ofrecer reenviar el enlace.
- Al ingresar, ir al panel o al destino protegido solicitado previamente.

### Registro de dueño

- Nombre completo, correo y contraseña con visibilidad alternable.
- Requisitos actuales: al menos 10 caracteres y hasta 72 bytes. No inventar exigencias de símbolos o mayúsculas.
- Acción “Crear cuenta”; conservar nombre y correo si falla el envío.
- Éxito: “Revisá tu correo”, aviso de enlace válido por 24 horas y reenvío.
- Aclarar que el peón debe usar el enlace de invitación. Registrar una cuenta no crea automáticamente un establecimiento.

### Verificación de correo

Variantes: verificando, correo verificado con acceso a login, enlace incompleto, enlace inválido/usado/vencido y orientación para pedir otro.

### Recuperación de acceso

Correo y acción “Enviar enlace”. Confirmación genérica, exista o no la cuenta, con validez de 30 minutos. Acceso para volver a login; estados enviando y error.

### Nueva contraseña

Nueva contraseña, requisitos, repetición y controles de visibilidad. Validar coincidencia. Al guardar, informar que se cerraron las sesiones anteriores y ofrecer iniciar sesión. Contemplar enlace ausente, inválido y solicitud de uno nuevo.

### Invitación del peón

La invitación se comprueba al abrir el enlace. Sin sesión, permite elegir “Crear cuenta” o “Ya tengo cuenta”. El registro usa nombre, correo y contraseña; se debe usar el correo invitado.

Con sesión de peón, mostrar identidad de la cuenta y un botón explícito “Aceptar invitación”. El éxito confirma la cantidad de campos habilitados y ofrece “Ir a mi panel”.

Diseñar variantes de invitación vencida, retirada, ya usada, inválida, sin campos vigentes, cuenta con correo distinto, cuenta de dueño incompatible, error de conexión y reintento. Una invitación no concede acceso antes de aceptarse.

### Mi perfil

Nombre editable; correo y rol de solo lectura. Guardar cambios con estado guardando, confirmación y error. Cerrar sesión y volver al panel. No hay carga de avatar, edición de correo ni cambio de rol en esta pantalla.

## 6. Estructura compartida de la aplicación

La navegación activa incluye Panel, Establecimientos, Bebederos, Animales, Mapa, Tareas, Alertas, Clima y Mi perfil. El dueño también ve Equipo e Historial. El dashboard agrega una barra de sesión con nombre, rol, perfil y cierre de sesión.

La mayoría de los módulos usa: navegación → título → selector de establecimiento → estado de carga/error → contenido. Equipo tiene alcance de cuenta; Historial usa su propio selector con establecimientos retirados. Perfil usa actualmente el marco de las pantallas de acceso.

**Propuesta para el rediseño:** unificar el marco de la aplicación y la ubicación de los controles de cuenta. En escritorio evaluar barra lateral y encabezado; en móvil, navegación compacta con acceso a todos los módulos permitidos. El selector de campo y la ubicación actual deben ser evidentes. No es obligatorio conservar las barras actuales.

## 7. Panel del dueño

**Objetivo:** entender dónde intervenir y acceder a la gestión.

Contenido real del panel conectado:

1. Encabezado “Panel del campo”, resumen general y control de tema local.
2. “Necesita atención”: cantidad de alertas activas, bebederos con agua crítica, baja o sin medición, y hasta tres mensajes de alerta.
3. “Tareas y actividad”: abiertas, pendientes, en progreso, por validar; muestra hasta cinco tareas con responsable y enlace al módulo.
4. “Recursos del campo”: cantidades de bebederos, animales y establecimientos, con accesos.
5. Clima compacto del campo; si hay varios, selector interno para consultar uno.
6. Ubicaciones: mapa compacto o lista con búsqueda por nombre, filtro por tipo y acceso a fichas.

El código utiliza secciones desplegables para organizar parte del contenido. En Figma se puede proponer otra jerarquía conservando el acceso a esos datos. Evitar que la información crítica quede oculta por defecto.

## 8. Panel del peón

**Objetivo:** consultar el estado del campo y orientar el trabajo cotidiano.

- Encabezado de marca, usuario y establecimiento, hora, fecha y control de tema local.
- Título “Monitoreo de Bebederos” y descriptor de estado hídrico y telemetría de ganado.
- Los mismos bloques conectados de atención, tareas, recursos, clima y ubicaciones.
- Sección adicional “Mediciones de bebederos”: tarjetas con nombre, identificador, categoría del agua, porcentaje, barra de nivel, estado operativo, última actualización, vigencia y capacidad en litros.
- “Consultar mediciones” vuelve a consultar los datos; no controla físicamente el bebedero.
- Cuando hay más bebederos que los incluidos en el panel, enlace para ver todos.

**Propuesta:** dar mayor protagonismo a “Mis tareas”, problemas de agua y mapa en celular. Mantener las acciones de administración fuera de esta variante.

## 9. Establecimientos

Listado filtrado por el campo seleccionado, con tarjetas de nombre, descripción, hectáreas, cantidad de animales y bebederos, coordenadas, antigüedad máxima permitida para mediciones y zona horaria.

El dueño puede crear y editar mediante formulario: nombre, latitud, longitud, superficie en ha, antigüedad máxima en minutos, zona horaria y descripción opcional. La zona horaria inicial es `America/Argentina/Buenos_Aires`; la antigüedad inicial es 180 minutos. Mostrar guardando, errores por campo y cancelar.

Eliminar requiere confirmación. Solo se puede retirar un campo sin animales, bebederos activos ni tareas abiertas. Se retiran accesos e invitaciones de ese campo y se conservan antecedentes. El peón consulta; no ve estas acciones.

## 10. Bebederos

Listado paginado y vista individual con nombre, capacidad en litros, estado operativo, nivel porcentual y categoría del agua, vigencia, fecha de actualización, coordenadas y origen de ubicación: dispositivo GPS o administrativa.

- Ambos roles: consultar y desplegar antecedentes.
- Dueño: crear en un campo seleccionado y eliminar con confirmación.
- Formulario de alta: nombre, capacidad positiva, estado operativo y coordenadas administrativas opcionales.
- Estados operativos: Operativo, En mantenimiento, Fuera de servicio.
- No hay edición de bebedero expuesta en esta pantalla actual.
- La baja no puede realizarse si hay tareas abiertas asociadas; conserva lecturas y antecedentes.

El nivel, la vigencia de la lectura y el estado operativo son dimensiones distintas. Un bebedero puede tener una lectura alta pero antigua, o estar en mantenimiento.

## 11. Animales

Listado paginado y ficha individual: identificación, especie, raza, edad en años, estado administrativo, posición GPS, vigencia y última visita estimada a un bebedero, con fecha.

Ambos roles consultan y despliegan antecedentes. El dueño puede crear, editar y eliminar. Formulario: identificación individual, especie, raza, edad no negativa y estado administrativo. La posición GPS se consulta; no se ingresa en este formulario.

La eliminación requiere confirmación y conserva posiciones y visitas estimadas. Diseñar “Sin ubicación recibida” y “Sin visitas registradas”. Junto a la visita conservar la aclaración de que es estimada por proximidad y no acredita consumo.

## 12. Mapa

Mapa de animales y bebederos con controles de zoom y marcadores diferenciados por forma y texto. Actualmente los animales usan círculo marrón con A y los bebederos cuadrado verde con B. Al seleccionar un marcador se ve tipo, nombre y “Abrir ficha”.

El centro se ajusta al establecimiento o a las posiciones disponibles. No se muestran ubicaciones inválidas. Hay una lista de ubicaciones con enlaces a las fichas, disponible también si falla el mapa base.

En el panel compacto hay selector Mapa/Lista; la lista incluye búsqueda por nombre, filtro Todos/Animales/Bebederos y paginación de ocho elementos. En la página de mapa completa, la lista actual no tiene esos filtros. Extenderlos sería una propuesta de mejora.

Conservar atribución del proveedor cartográfico. No inventar seguimiento animado en vivo, recorridos, geocercas o edición de posiciones.

## 13. Tareas y Mis tareas

Listado paginado, filtro por estado y ficha con historial. Cada tarjeta muestra título, descripción, estado, prioridad, responsable, fecha límite, aviso si está vencida y bebedero asociado cuando corresponde.

**Estados:** Pendiente → En progreso → Pendiente de validación → Completada. El rechazo se registra con motivo y requiere revisión del trabajo; no añadir un estado independiente “Rechazada” a la lista actual.

**Dueño:** crear una tarea en un campo seleccionado; ingresar título, descripción, prioridad Baja/Media/Alta, fecha y hora límite, peón responsable y bebedero opcional. Solo se ofrecen responsables asignados a ese campo. Si no hay peones, orientar a Equipo. Puede reasignar tareas no completadas. En pendientes de validación puede aprobar o rechazar; para rechazar debe escribir un motivo.

**Peón:** ve “Mis tareas”; una pendiente permite “Iniciar tarea”, una en progreso permite “Enviar a validación”. No aprueba su propio trabajo.

**Detalle:** historial y comentarios con fecha, actor, estado, creación, inicio, envío, aprobación, rechazo, reasignación o retiro de acceso.

**Cambio concurrente:** si otro usuario modificó la tarea, se consulta el estado actualizado y se solicita “Revisé el estado actualizado” antes de seguir. Diseñar este estado como una situación recuperable.

## 14. Equipo e invitaciones

Exclusivo del dueño. Listado paginado de peones con nombre, correo y campos asignados. “Editar asignaciones” permite seleccionar varios campos mediante casillas y guardar con confirmación.

Retirar un campo revoca inmediatamente ese acceso y deja sin responsable las tareas abiertas, conservando su estado. Los accesos otorgados por otros dueños se conservan.

En la misma pantalla hay una sección Invitaciones:

- Formulario con correo del peón y selección de establecimientos.
- “Enviar invitación”, habilitado cuando hay campos seleccionados.
- Explicación: el acceso comienza al aceptar y el enlace vence en siete días.
- Lista paginada con correo, estado de invitación, estado de envío, vencimiento y campos incluidos.
- Reintentar envío cuando falló y la invitación sigue pendiente.
- Retirar invitación pendiente con confirmación; el enlace deja de servir.

No incluir un botón de “eliminar cuenta del peón”: la gestión actual modifica accesos y asignaciones.

## 15. Alertas y notificaciones

Dos bloques en una pantalla:

**Alertas:** selector Activas/Resueltas, mensaje, recurso afectado, campo, fecha de generación, fecha de resolución cuando existe y “Ver recurso”. Paginación propia. Las condiciones incluyen agua baja, crítica, desactualizada o ausente y GPS desactualizado o ausente. No hay botón de resolución manual en la interfaz actual.

**Notificaciones de tareas:** mensaje, fecha, Leída/Sin leer y acción “Marcar como leída”. Paginación independiente y estados de consulta propios.

No usar el estado de lectura de una notificación como equivalente a resolver una alerta.

## 16. Clima

Una tarjeta por establecimiento autorizado, o solo la del seleccionado. Datos: nombre del campo, temperatura en °C, condición, humedad, probabilidad de lluvia, período de referencia de la máxima diaria de esa probabilidad, zona horaria, fecha de referencia, fecha de consulta, fuente y modelo.

En la tarjeta compacta del panel se reduce a temperatura, condición, probabilidad de lluvia y actualización. No hay pronóstico semanal en la interfaz actual.

Diseñar carga, error con reintento, información no disponible y datos antiguos. La antigüedad debe resultar visible incluso cuando se conserva una tarjeta con datos anteriores.

## 17. Historial y antecedentes

Historial general exclusivo del dueño. Filtros: establecimiento —incluidos los retirados—, tipo de evento, desde y hasta con fecha/hora local. Lista cronológica paginada.

Tipos: Agua, Posiciones GPS, Visitas estimadas, Alertas, Tareas y Bajas administrativas. Cada evento muestra recurso, campo, fecha en su zona horaria, actor cuando corresponde y detalles particulares:

- Agua: porcentaje y categoría.
- GPS: latitud y longitud.
- Visita: bebedero y aclaración de estimación.
- Alerta: generación/resolución y condición.
- Tarea: transición, responsable anterior/nuevo y comentario.
- Baja: retiro del recurso con antecedentes conservados.

Las fichas de animales y bebederos integran una versión de antecedentes del recurso, desplegable y paginada. No hay exportación ni gráficos históricos implementados en esta interfaz.

## 18. Estados y reglas transversales

Diseñar variantes reutilizables para:

- Carga inicial y actualización en curso.
- Error con explicación y reintento.
- Lista vacía y búsqueda/filtros sin resultados.
- Sesión vencida y acceso no autorizado a un campo.
- Sin conexión con datos anteriores; no prometer guardado offline.
- Dato vigente, desactualizado y nunca recibido.
- Guardando, enviando, éxito y validación por campo.
- Confirmación de baja, retiro de invitación y modificación de accesos.
- Paginación con anterior/siguiente deshabilitados en los extremos.

**Reglas de veracidad:** sin medición no significa 0%; sin alertas no garantiza que todos los sensores estén actualizados; una posición es la última recibida, no necesariamente la ubicación presente. No inventar consumo, batería, caudal, sensores adicionales ni control remoto de válvulas. No fijar nuevos umbrales de categorías de agua desde el diseño: usar las categorías suministradas por el sistema.

## 19. Identidad existente y dirección propuesta

**Observado en el código:** logo propio, fotografía de ganado como fondo de acceso, verdes oscuros y naturales, acentos tierra/dorados y superficies claras. Navegación verde oscuro `#103c27`, texto claro `#eff9ed`, botones verdes `#198754` y algunos acentos `#d3a865`. La base global declara Geist Variable; hay estilos específicos por pantalla. Tarjetas redondeadas, iconos de Lucide y controles de aproximadamente 44 px de alto como mínimo en muchos componentes.

Los paneles tienen controles de tema propios y existen tokens oscuros globales, pero no se debe asumir que hoy hay un modo oscuro uniforme en toda la aplicación.

**Propuesta de diseño, abierta a cambios:** una identidad rural sobria, de producto operativo, con un sistema visual único. Fondo neutro claro, superficies legibles, verde para marca/acciones y colores semánticos acompañados por texto e iconos. Reservar el rojo para criticidad y acciones destructivas; diferenciar ausencia de datos con tratamiento neutro. Usar fotografías en acceso si aportan identidad, sin ocupar espacio de trabajo esencial en paneles.

Hacer del agua y la vigencia de medición un patrón reconocible: porcentaje legible, categoría textual, indicador de nivel, fecha y estado de actualización. Priorizar la lectura rápida sobre decoraciones y animaciones.

## 20. Componentes y entregables sugeridos en Figma

Crear componentes con variantes de rol, tamaño, estado y dispositivo:

- Marco de aplicación, navegación, encabezado y menú de cuenta.
- Selector de establecimiento y filtros.
- Botones primario, secundario, destructivo y solo icono.
- Campos, selectores, casillas, fechas, contraseña y mensajes de validación.
- Tarjetas de métricas, bebedero, animal, campo, tarea y clima.
- Indicadores de agua, vigencia, prioridad, estado y lectura.
- Bloque de atención, notificación y evento histórico.
- Mapa, marcador, ventana de recurso y lista alternativa.
- Sección desplegable, paginación y confirmación.
- Carga, error, vacío, sin acceso y conexión perdida.

**Propuesta de frames:** escritorio de 1440 px, tablet de 768 px y móvil de 390 px; comprobar adaptación hasta 360 px. Estos tamaños son objetivos de diseño, no medidas verificadas del sitio. Usar Auto Layout y componentes reutilizables. Evitar desbordamiento horizontal en formularios y contenido principal.

Objetivos de accesibilidad propuestos: contraste WCAG AA, texto de cuerpo cercano a 16 px, controles táctiles de al menos 44 × 44 px, foco visible, etiquetas persistentes y estados comprensibles sin depender del color. Validar también nombres largos, correos extensos y fechas localizadas.

Organizar el archivo en páginas: Contexto y flujos; Fundamentos; Componentes; Acceso; Dueño; Peón; Estados y responsive. Si se diseña tema oscuro, incluir variantes coherentes como una mejora propuesta.

## 21. Flujos a conectar en el prototipo

1. Registro de dueño → revisar correo → verificación → login → panel.
2. Recuperar acceso → correo enviado → enlace de restablecimiento → nueva contraseña → login.
3. Dueño crea campo → agrega bebederos y animales → consulta mapa y panel.
4. Dueño invita peón → peón abre enlace → crea cuenta o inicia sesión → acepta → panel de peón.
5. Dueño crea tarea → peón inicia → envía a validación → dueño aprueba; variante con rechazo y motivo.
6. Panel con agua crítica → alertas → ficha del bebedero → antecedentes. Si se crea una tarea, usar el formulario actual; un atajo automático desde la alerta sería una propuesta.
7. Mapa → marcador o lista → ficha del animal/bebedero.
8. Equipo → editar campos asignados → confirmar retiro de acceso → tareas abiertas sin responsable → reasignar.
9. Historial → filtrar campo/tipo/período → consultar eventos de un recurso retirado.

## 22. Material existente que no debe confundirse con pantallas activas

Existe un componente antiguo de bienvenida con selección Dueño/Peón y un módulo antiguo de autorización, pero no están montados en el enrutador principal. No usar esa selección de rol como flujo actual.

Los componentes de panel también conservan variantes completas de demostración: tarjetas de métricas, fotografía y barras laterales. El enrutador usa variantes `compact`, con contenido conectado distinto. La descripción de los paneles de este documento corresponde a esa composición activa.

Una landing pública, selección libre de rol, edición de bebedero, control físico del agua, exportación, gráficos de evolución, pronóstico semanal y carga de fotos serían ampliaciones, no pantallas actuales.

## 23. Referencias de implementación

Para contrastar el diseño con el proyecto:

- Rutas y composición activa: `frontend/mi-proyecto-shadcn/src/App.jsx`.
- Navegación y estructura: `src/components/AppNavigation.jsx`, `ResourceLayout.jsx`, `FarmSelector.jsx`.
- Panel conectado: `src/components/DashboardDetails.jsx` y `src/pages/InterfazDuenio/`, `src/pages/interfazPeon/`.
- Pantallas de acceso: `src/pages/autorizationModule/`.
- Módulos de negocio: `src/pages/Establecimientos/`, `Bebederos/`, `Animales/`, `Tareas/`, `Peones/`, `Alertas/`, `Clima/`, `Historial/`, `Profile/`.
- Marca disponible: `src/pages/interfaz-principal/logo.png`, `logo_header.png`, `fondo_vacas.webp`.
- Estilos globales: `src/index.css`; hay además CSS específicos de acceso y paneles.

Las referencias `src/…` se resuelven dentro de `frontend/mi-proyecto-shadcn/`. Este documento no cambia la interfaz ni presupone que Figma pueda acceder al repositorio: adjuntar los recursos de marca si se quieren usar en los diseños.
