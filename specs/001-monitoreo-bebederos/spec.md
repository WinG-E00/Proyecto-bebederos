# Feature Specification: Monitoreo remoto de bebederos — MVP

**Feature Branch**: `develop` (rama actual; sin creación de rama por hook)

**Created**: 2026-10-06

**Status**: Draft — validada para planificación

**Input**: Descripción funcional del Proyecto Bebederos proporcionada por el usuario: aplicación web para dueños y peones, con monitoreo remoto, establecimientos, animales, invitaciones, tareas, alertas internas, clima e historial.

## Clarifications

### Session 2026-10-06

- Q: ¿La aplicación debe enviar las invitaciones a peones por correo electrónico en el MVP? → A: Sí. La aplicación envía el correo de invitación; durante planificación se autorizan además verificación de cuenta y recuperación de contraseña. Las alertas de agua, GPS y tareas permanecen internas.

- Q: ¿Qué debe ocurrir con las tareas abiertas de un peón cuando el dueño le quita acceso a un establecimiento? → A: Retirar el acceso inmediatamente y dejar las tareas abiertas sin asignar, conservando su estado e historial para su posterior reasignación por el dueño.

- Q: ¿Durante cuánto tiempo debe poder aceptarse una invitación a un peón antes de que venza? → A: Siete días desde su emisión; después no concede acceso y el dueño puede emitir una nueva.

- Q: ¿Qué debe ocurrir si dos acciones intentan cambiar la misma tarea a partir de un estado que ya cambió? → A: Conservar el primer cambio válido y rechazar la acción desactualizada, mostrando el estado vigente para que el usuario lo revise antes de reintentar.

- Q: ¿Permitimos correos de verificación de cuenta y recuperación de contraseña además de invitaciones? → A: Sí; son mensajes de acceso permitidos. Las alertas operativas permanecen internas.

## User Scenarios & Testing *(mandatory)*

El producto permite vigilar el agua y localizar animales sin inspecciones presenciales constantes. Las prioridades P1–P9 expresan el orden solicitado, no funcionalidades opcionales: todas integran el MVP. Cada escenario se prueba con cuentas y datos de ejemplo preparados, sin exigir dispositivos físicos.

### User Story 1 - Acceder con un único rol y permisos propios (Priority: P1)

Como dueño quiero registrarme; como peón quiero entrar mediante una invitación, para consultar únicamente la información que me corresponde.

**Why this priority**: La separación de roles y de información protege todos los recorridos posteriores.

**Independent Test**: Usar un dueño, un peón invitado y establecimientos de dos dueños; comprobar acceso y denegaciones.

**Acceptance Scenarios**:

1. **Given** una persona sin cuenta, **When** se registra libremente, **Then** obtiene exclusivamente el rol dueño y su interfaz.
2. **Given** una invitación vigente dirigida a su correo, **When** una persona crea su cuenta y la acepta, **Then** obtiene exclusivamente el rol peón y acceso a los establecimientos incluidos.
3. **Given** una cuenta dueño, **When** intenta aceptar una invitación como peón, **Then** se rechaza sin cambiar el rol ni conceder acceso.
4. **Given** un peón, **When** intenta consultar un establecimiento no asignado, incluso mediante un acceso directo, **Then** no obtiene información, marcadores, cantidades, alertas ni historial de ese establecimiento.
5. **Given** una cuenta autenticada, **When** cierra sesión, **Then** debe volver a autenticarse para consultar información privada.

### User Story 2 - Administrar establecimientos (Priority: P2)

Como dueño quiero organizar mis campos y sus recursos para supervisar varios establecimientos desde una misma cuenta.

**Why this priority**: El establecimiento define la pertenencia y el alcance de toda la información.

**Independent Test**: Crear dos establecimientos y editar sus datos; verificar agrupación y cantidades, incluyendo un campo vacío.

**Acceptance Scenarios**:

1. **Given** un dueño, **When** crea un establecimiento con nombre, ubicación, superficie y descripción, **Then** queda vinculado a ese dueño con cero animales y bebederos inicialmente.
2. **Given** un establecimiento propio, **When** modifica sus datos administrativos, **Then** los cambios aparecen en sus vistas sin alterar pertenencias de otros campos.
3. **Given** un establecimiento con recursos o tareas abiertas, **When** solicita eliminarlo, **Then** se informa qué dependencias impiden la eliminación y no se pierde información.
4. **Given** un establecimiento sin recursos ni tareas abiertas, **When** confirma su eliminación, **Then** desaparece de vistas activas, cesan las asignaciones e invitaciones asociadas y se conserva su historial para el dueño.

### User Story 3 - Consultar y monitorear bebederos (Priority: P3)

Como dueño quiero agregar y eliminar bebederos; como usuario autorizado quiero conocer su nivel y ubicación para detectar necesidades de agua.

**Why this priority**: Consultar agua a distancia es el propósito principal del proyecto.

**Independent Test**: Preparar bebederos con niveles 0, 19, 20, 50, 51 y 100; cambiar una lectura disponible y observar la pantalla abierta.

**Acceptance Scenarios**:

1. **Given** un campo propio, **When** el dueño agrega un bebedero con datos administrativos válidos, **Then** puede consultar identificador, nombre o código, ubicación, capacidad, estado operativo, campo, nivel y última actualización.
2. **Given** niveles válidos, **When** se muestran, **Then** 20% y 50% son Bajo, más de 50% es Normal y menos de 20% es Crítico.
3. **Given** la pantalla abierta, **When** cambia el nivel disponible, **Then** se actualizan nivel, estado derivado, resumen y alertas asociadas sin recarga manual.
4. **Given** dueño o peón, **When** consulta un nivel, **Then** es de solo lectura y cualquier intento de modificación se rechaza.
5. **Given** un bebedero sin tareas abiertas, **When** el dueño confirma su eliminación, **Then** deja de figurar entre recursos activos y sus antecedentes permanecen consultables.

### User Story 4 - Localizar animales y consultar visitas estimadas (Priority: P4)

Como dueño quiero administrar animales individuales; como usuario autorizado quiero localizar cada animal y ver su última visita estimada a un bebedero.

**Why this priority**: Permite interpretar la distribución de animales y su proximidad al agua sin afirmar que bebieron.

**Independent Test**: Crear y editar un animal, preparar posiciones fuera y dentro del rango de un bebedero y consultar el mapa y sus antecedentes.

**Acceptance Scenarios**:

1. **Given** un establecimiento propio, **When** el dueño crea o edita un animal, **Then** conserva su identificación individual y datos administrativos; no puede modificar su GPS ni visitas calculadas.
2. **Given** una nueva ubicación disponible, **When** el usuario mantiene abierta la vista, **Then** la posición y el marcador cambian automáticamente y se conserva la posición anterior en el historial.
3. **Given** un animal fuera del rango de proximidad, **When** una posición válida lo sitúa dentro del rango de un bebedero del mismo establecimiento, **Then** se registra fecha y hora de la visita estimada y aparece «Última visita al bebedero».
4. **Given** un animal que permanece dentro del rango, **When** llegan más posiciones dentro de ese rango, **Then** no se registran visitas nuevas hasta que salga y vuelva a entrar.
5. **Given** un animal sin visitas registradas, **When** se consulta, **Then** aparece «Sin visitas registradas» y nunca se afirma que bebió.
6. **Given** marcadores visibles, **When** se selecciona un animal o bebedero y se filtra por campo, **Then** se distingue el tipo, se muestran sus datos y solo aparecen recursos permitidos del campo seleccionado.

### User Story 5 - Invitar y administrar peones (Priority: P5)

Como dueño quiero asignar peones a campos específicos; como peón quiero aceptar invitaciones de distintos dueños con una sola cuenta.

**Why this priority**: Habilita el trabajo compartido respetando el alcance de cada dueño.

**Independent Test**: Invitar un peón a dos campos de un dueño y a uno de otro; modificar y quitar asignaciones.

**Acceptance Scenarios**:

1. **Given** un dueño, **When** ingresa un correo y selecciona uno o varios campos propios, **Then** genera una invitación pendiente y envía al destinatario un correo con el acceso para aceptarla; todavía no concede acceso.
2. **Given** la invitación, **When** el destinatario crea una cuenta o inicia sesión y acepta, **Then** obtiene únicamente las asignaciones vigentes incluidas en ella.
3. **Given** un peón asociado a otro dueño, **When** acepta una nueva invitación, **Then** acumula acceso a los nuevos campos sin perder sus asignaciones anteriores.
4. **Given** una asignación activa, **When** el dueño la cambia o quita, **Then** el alcance del peón se actualiza y no conserva acceso al campo retirado.
5. **Given** un peón de varios dueños, **When** uno lo desvincula de su equipo, **Then** pierde todas las asignaciones de ese dueño y mantiene las de los demás.
6. **Given** una invitación de otro correo o retirada, **When** se intenta aceptarla, **Then** no concede acceso; aceptar de nuevo una ya aceptada no duplica asignaciones.

### User Story 6 - Asignar, realizar y validar tareas (Priority: P6)

Como dueño quiero asignar y revisar trabajos; como peón quiero informar su avance y recibir el motivo de una devolución.

**Why this priority**: Convierte la observación del campo en acciones supervisadas.

**Independent Test**: Recorrer una tarea desde Pendiente hasta Completada, incluyendo un rechazo intermedio.

**Acceptance Scenarios**:

1. **Given** un peón asignado al campo, **When** el dueño crea una tarea con los datos requeridos, **Then** queda Pendiente y el peón recibe una notificación interna.
2. **Given** su tarea Pendiente, **When** el peón inicia el trabajo y luego informa que terminó, **Then** pasa a En progreso y posteriormente a Pendiente de validación.
3. **Given** una tarea Pendiente de validación, **When** el dueño la aprueba, **Then** pasa a Completada y el peón recibe una notificación interna.
4. **Given** una tarea Pendiente de validación, **When** el dueño la rechaza con un motivo no vacío, **Then** vuelve a En progreso, conserva el motivo e informa al peón; sin motivo se rechaza la operación.
5. **Given** una tarea ajena o una transición no permitida, **When** un peón intenta cambiarla o aprobarla, **Then** no cambia su estado.
6. **Given** tareas abiertas de un peón que perderá su asignación, **When** el dueño solicita retirarla, **Then** se retira el acceso inmediatamente y sus tareas abiertas quedan sin asignar, conservando el estado e historial; el dueño puede reasignarlas después a otro peón del campo.

### User Story 7 - Detectar niveles problemáticos y datos desactualizados (Priority: P7)

Como usuario autorizado quiero recibir alertas internas y distinguir datos antiguos para priorizar inspecciones.

**Why this priority**: Evita interpretar una lectura antigua como estado actual y avisa sobre escasez de agua.

**Independent Test**: Cambiar niveles, adelantar el tiempo respecto de la última actualización y configurar límites distintos en dos campos.

**Acceptance Scenarios**:

1. **Given** un bebedero Normal, **When** entra en Bajo o Crítico, **Then** se genera una alerta visible para el dueño y los peones asignados al campo.
2. **Given** un campo con límite predeterminado, **When** pasan más de tres horas desde la última lectura de agua o GPS, **Then** aparece «Datos desactualizados», la fecha y hora recibida y una alerta interna.
3. **Given** un límite propio del campo, **When** el dueño lo modifica a una duración positiva, **Then** se reevalúan sus datos con ese límite sin cambiar otros campos.
4. **Given** una alerta por desactualización, **When** llega un dato válido y reciente, **Then** desaparece el estado desactualizado, se resuelve la alerta activa y se conserva su historial.
5. **Given** una condición que continúa, **When** se actualiza la vista repetidamente, **Then** no se crean alertas duplicadas por el mismo episodio.

### User Story 8 - Consultar el clima del campo (Priority: P8)

Como usuario autorizado quiero consultar el clima según la ubicación de mi campo para organizar el trabajo.

**Why this priority**: El clima actual es esencial para las decisiones del MVP.

**Independent Test**: Consultar dos establecimientos con ubicaciones diferentes y simular ausencia de información climática.

**Acceptance Scenarios**:

1. **Given** un campo con ubicación válida, **When** se consulta el clima, **Then** aparecen temperatura, humedad, condición y probabilidad de lluvia correspondientes a su ubicación, con referencia temporal.
2. **Given** información climática no disponible, **When** se consulta, **Then** se informa la indisponibilidad sin presentar valores inventados ni impedir consultar agua, animales o tareas.

### User Story 9 - Revisar antecedentes y supervisar desde dashboards (Priority: P9)

Como dueño quiero revisar lo ocurrido y su equipo; como peón quiero un resumen móvil de sus campos y tareas.

**Why this priority**: Da contexto y trazabilidad a la supervisión, una vez cubiertos los recorridos operativos.

**Independent Test**: Preparar eventos y recursos en distintos campos y comparar dashboards e historial según permisos.

**Acceptance Scenarios**:

1. **Given** cambios de agua, posiciones, visitas, alertas y tareas, **When** el dueño consulta historial por campo y período, **Then** aparecen los antecedentes fechados, incluyendo aprobaciones y rechazos.
2. **Given** un dueño con varios campos, **When** abre su dashboard, **Then** ve las cantidades, alertas, tareas, equipo, clima y mapa de sus campos exclusivamente.
3. **Given** un peón con varios campos asignados, **When** abre el dashboard desde el teléfono, **Then** ve sus tareas, recursos, alertas, clima y mapa dentro del alcance autorizado y puede completar el flujo de avance sin usar escritorio.

### Edge Cases

- Exactamente 20% y 50% se clasifican como Bajo; 0% es Crítico y 100% es Normal. Fuera de 0–100, o sin lectura, se muestra «Dato no disponible» y no se calcula una categoría con ese valor.
- Una lectura inválida no reemplaza una lectura válida anterior: esta conserva su fecha y puede quedar desactualizada. No se inventan niveles ni coordenadas.
- Exactamente al cumplirse el límite el dato aún no está desactualizado; lo está cuando lo supera. Un recurso sin ninguna actualización muestra «Sin datos recibidos», sin fecha ficticia, y una alerta de ausencia de datos.
- Un GPS ausente o inválido no crea un marcador ficticio ni una visita. Una posición anterior a la última procesada no reemplaza la ubicación actual ni crea una nueva visita.
- Si dos rangos de bebederos se superponen, se atribuye la visita al más cercano; ante igual distancia, al identificador menor en orden estable. Nunca se vincula a un bebedero de otro campo.
- La primera posición válida dentro de un rango cuenta como primera visita estimada; su hora corresponde a la posición recibida, no al momento de abrir la pantalla.
- Una pérdida de conexión se comunica al usuario; se conserva la última información con su fecha y no se presenta como recién actualizada. El MVP no exige operar sin conexión.
- Revocar acceso afecta también una pantalla ya abierta: la información retirada deja de estar visible en el siguiente refresco automático, dentro del objetivo SC-003, y las nuevas consultas y acciones se deniegan desde la revocación.
- No se elimina un bebedero con tareas abiertas relacionadas. Eliminar animales o bebederos conserva las referencias históricas y no altera hechos registrados.
- Sin campos, animales, bebederos, peones o tareas se muestran cantidades cero y estados vacíos comprensibles. Un peón sin asignaciones puede entrar a su perfil y aceptar invitaciones, pero no consultar campos.
- Si una tarea queda sin asignar al revocar acceso, conserva su estado, incluso Pendiente de validación. El dueño puede validarla si corresponde o reasignarla; solo el nuevo responsable con acceso puede ejecutar los avances permitidos. Las tareas completadas mantienen su responsable histórico.
- Ante acciones simultáneas sobre una tarea, prevalece el primer cambio válido. La acción basada en un estado o responsable anterior se rechaza, incluso si sería una transición válida desde el estado nuevo; se muestra la información vigente para que el usuario la revise antes de reintentar.
- Una tarea vencida conserva su estado y muestra la fecha vencida; no se completa ni se rechaza automáticamente.
- Una invitación pendiente es aceptable antes de cumplirse siete días de su emisión; exactamente al cumplirse el plazo queda Vencida y no concede acceso. Vencer una invitación no afecta accesos ya obtenidos mediante su aceptación.
- Una invitación con campos eliminados o retirados no concede acceso a ellos; si no queda ninguno, se informa que no puede aceptarse.

## Requirements *(mandatory)*

### Functional Requirements

Cada requisito es una obligación verificable. Los escenarios anteriores y las reglas de negocio siguientes definen resultados de aceptación complementarios.

#### Acceso y separación de información

- **FR-001**: Permitir registro libre únicamente como dueño y creación de cuenta peón mediante invitación vigente dirigida al mismo correo verificado de la cuenta.
- **FR-002**: Permitir verificar el correo, iniciar y cerrar sesión y recuperar acceso mediante los correos de seguridad autorizados y consultar o modificar datos personales del perfil sin cambiar el rol. Una cuenta debe tener exactamente un rol.
- **FR-003**: Mostrar interfaz y acciones correspondientes al rol. El dueño administra solo sus campos; el peón consulta únicamente sus campos explícitamente asignados y modifica solo estados de sus propias tareas.
- **FR-004**: Aplicar el alcance autorizado a todas las consultas, acciones, mapas, búsquedas, filtros, alertas, historial y cantidades, incluso ante accesos directos. Un dueño no obtiene datos de otros dueños porque compartan un peón.

#### Establecimientos y recursos

- **FR-005**: Permitir al dueño crear, consultar, editar y eliminar establecimientos propios bajo las reglas de conservación histórica y dependencias; registrar nombre, ubicación, superficie, descripción y dueño.
- **FR-006**: Calcular cantidades de animales y bebederos activos por establecimiento; agrupar recursos, asignaciones, tareas, alertas, historial y clima por su campo.
- **FR-007**: Permitir al dueño agregar, consultar y eliminar bebederos propios; al peón, consultarlos en sus campos. Registrar identificador, nombre o código, ubicación, capacidad máxima positiva, estado operativo y campo.
- **FR-008**: Mostrar para cada bebedero su nivel individual de agua entre 0% y 100%, categoría derivada y fecha y hora de última actualización; mantener separado el estado operativo de la categoría de agua y de la vigencia del dato.
- **FR-009**: Impedir a ambos roles modificar manualmente el nivel de agua, sus fechas de medición y la ubicación GPS recibida de dispositivos, incluyendo coordenadas de bebederos cuando tengan ese origen. Los metadatos administrativos no deben permitir sobrescribir lecturas.
- **FR-010**: Permitir al dueño crear, consultar, editar y eliminar animales de sus campos. Cada animal debe tener identificador individual, nombre o código, especie, raza, edad y estado; cada animal activo pertenece a un único establecimiento.
- **FR-011**: Permitir a ambos roles consultar animales autorizados, su GPS actual, fecha y hora de actualización y último bebedero visitado; las posiciones, fechas recibidas y visitas calculadas son de solo lectura.
- **FR-012**: Registrar una visita estimada por entrada del animal en el rango de proximidad de un bebedero de su campo, según las reglas de casos límite; mostrar bebedero, fecha y hora como «Última visita al bebedero». No afirmar ni inferir como hecho comprobado el acto de beber.
- **FR-013**: Proveer mapa interactivo con marcadores distinguibles de animales y bebederos, selección para consultar datos y centrado o filtrado por establecimiento; excluir elementos sin coordenadas válidas e informar esa ausencia en su ficha.

#### Equipo e invitaciones

- **FR-014**: Permitir al dueño ingresar el correo destinatario, seleccionar uno o varios campos propios y emitir una invitación; permitir al destinatario crear cuenta o iniciar sesión y aceptarla. La aplicación debe enviar al destinatario un correo con el acceso para aceptar la invitación. La emisión no concede acceso antes de la aceptación. Si el envío falla, debe informar al dueño y permitir reintentarlo sin duplicar la invitación ni conceder acceso.
- **FR-015**: Permitir que un peón acepte invitaciones de varios dueños y acumule asignaciones; impedir que cuentas dueño las acepten como peón y que otro destinatario las utilice.
- **FR-016**: Permitir al dueño consultar su equipo, cambiar asignaciones, quitar un peón de un campo y desvincularlo de su equipo; retirar únicamente accesos de ese dueño, conservando antecedentes.
- **FR-017**: Mostrar al dueño invitaciones pendientes, aceptadas, retiradas y vencidas, y permitir retirar las pendientes. Las invitaciones pendientes vencen al cumplirse siete días desde su emisión y no pueden aceptarse desde ese instante. Permitir emitir una nueva tras el vencimiento; reintentar el envío de la misma invitación no renueva su plazo. Evitar duplicar asociaciones al aceptar reiteradamente una invitación.

#### Tareas

- **FR-018**: Permitir al dueño crear y asignar tareas con título, descripción, prioridad, fecha límite, estado inicial Pendiente, establecimiento y peón asignado; permitir un bebedero relacionado opcional del mismo campo. Solo se puede asignar un peón con acceso al campo.
- **FR-019**: Permitir al peón consultar sus tareas y ejecutar únicamente Pendiente → En progreso → Pendiente de validación.
- **FR-020**: Permitir solo al dueño del campo validar una tarea Pendiente de validación: aprobarla como Completada o rechazarla como En progreso con comentario obligatorio no vacío.
- **FR-021**: Conservar y mostrar comentarios de rechazo y cada transición con fecha, hora y responsable; impedir transiciones fuera del flujo definido. Una tarea Completada queda cerrada en el MVP. Si el estado o responsable cambió desde que el usuario consultó la tarea, rechazar la acción desactualizada sin sobrescribir el primer cambio válido, mostrar el estado y responsable vigentes y permitir reintentar únicamente una acción todavía autorizada y válida.
- **FR-022**: Permitir al dueño consultar tareas actuales e históricas de su equipo y reasignar tareas abiertas a peones del mismo campo. Al retirar la asignación del responsable, revocar el acceso inmediatamente y dejar sus tareas abiertas sin asignar, conservando el estado e historial. Mostrar estas tareas al dueño como pendientes de reasignación; registrar la retirada del responsable y las posteriores reasignaciones e informar internamente al nuevo responsable. La falta de otro peón disponible no debe impedir revocar el acceso.

#### Alertas y actualización

- **FR-023**: Generar alertas internas al entrar un bebedero en Bajo o Crítico y al detectar desactualización de agua o GPS animal; hacerlas visibles al dueño y todos los peones actualmente asignados al campo.
- **FR-024**: Generar notificaciones internas al asignar una tarea y al aprobarla o rechazarla, visibles para el peón responsable y el dueño del campo. No comunicar tareas de otros peones como tareas propias.
- **FR-025**: Considerar desactualizado un dato cuando el tiempo desde su última actualización supera el límite del campo: tres horas por defecto. Permitir al dueño configurar una duración positiva independiente para cada campo y rechazar valores nulos, cero o negativos.
- **FR-026**: Mostrar «Datos desactualizados» y fecha y hora de la última actualización para cada dato vencido; conservar el último valor identificado como antiguo. Mostrar ausencia de datos conforme a los casos límite.
- **FR-027**: Mantener una alerta activa por recurso y condición mientras dure el episodio; resolverla al desaparecer la condición y conservarla históricamente. Una transición Bajo → Crítico resuelve la alerta Bajo y crea Crítico; la recuperación a Normal resuelve la alerta de nivel. Nivel y desactualización pueden coexistir.
- **FR-028**: Actualizar automáticamente nivel de agua, GPS animal, estados derivados, alertas asociadas, marcadores y resúmenes afectados sin recarga manual mientras la vista esté abierta y conectada, conforme a SC-003.
- **FR-029**: Mostrar los errores o la pérdida de conexión sin inventar datos ni borrar antecedentes; cuando se recupera la conexión, retomar automáticamente la actualización y los controles de acceso.

#### Clima, historial y experiencia

- **FR-030**: Mostrar clima según la ubicación de cada campo autorizado, incluyendo temperatura, humedad, condición climática, probabilidad de lluvia y referencia temporal. Mostrar indisponibilidad cuando no se pueda obtener información actual.
- **FR-031**: Conservar historial de cambios de agua, alertas, transiciones y finalización de tareas, GPS anteriores y visitas estimadas, con recurso, campo, fecha y hora; incluir responsable en acciones humanas.
- **FR-032**: Permitir al dueño consultar historial de sus campos y filtrarlo por campo, tipo de evento y período. El peón consulta antecedentes de agua, posiciones y visitas de sus campos desde las fichas, y cambios de sus tareas; toda consulta respeta el acceso vigente.
- **FR-033**: Mostrar dashboard del dueño con cantidad de establecimientos, animales y bebederos, cantidades o resumen Bajo/Crítico, alertas activas, tareas pendientes, peones asociados, resumen del clima y mapa con animales y bebederos.
- **FR-034**: Mostrar dashboard del peón con campos asignados, sus tareas Pendiente y En progreso, cantidad de bebederos visibles, resumen Bajo/Crítico, alertas activas, animales visibles, clima y mapa. Informar también sus tareas Pendiente de validación.
- **FR-035**: Proveer al dueño las pantallas Dashboard general, Establecimientos, Bebederos, Animales, Peones, Tareas, Alertas, Historial, Clima y Perfil y configuración; al peón, Dashboard, Mis tareas, Bebederos, Animales, Alertas, Clima y Perfil, con acceso a sus campos desde el dashboard.
- **FR-036**: Permitir el uso completo en escritorio, tablet y teléfono: formularios, selección de mapas, alertas y acciones de tareas deben ser utilizables mediante interacción táctil, sin requerir desplazamiento horizontal de toda la página. Mantener la identidad visual existente y documentar en planificación los ajustes necesarios.
- **FR-037**: Validar datos administrativos obligatorios y relaciones: superficie y edad no negativas, capacidad positiva, nombres no vacíos, ubicaciones válidas y pertenencia coherente de recursos. Informar errores indicando el campo o relación que debe corregirse.
- **FR-038**: Requerir confirmación explícita para eliminaciones y desvinculaciones desde la aplicación, informar sus consecuencias y aplicar las reglas de dependencias e historial sin borrar hechos anteriores.

### Business Rules

- **BR-001 — Roles y pertenencia**: Una cuenta tiene un solo rol. Un campo tiene un dueño; animales y bebederos activos pertenecen a un campo. Un peón puede tener múltiples asignaciones de múltiples dueños. El acceso se deriva de asignaciones aceptadas y vigentes.
- **BR-002 — Umbrales**: Normal > 50%; Bajo 20–50% inclusive; Crítico < 20%. Estos umbrales no son configurables en el MVP. Las categorías solo se calculan sobre lecturas válidas.
- **BR-003 — Vigencia**: El límite es por campo y aplica por separado a agua y GPS animal. Recibir un dato nuevo no convierte automáticamente otros datos en recientes. Cambiar el límite reevalúa alertas y estados.
- **BR-004 — Visitas**: La proximidad es una estimación, nunca prueba de consumo. Debe existir un rango definido antes de validar las visitas; distancia, precisión y tratamiento técnico se definen en diseño sin cambiar las reglas de entrada y atribución aquí establecidas.
- **BR-005 — Tareas**: Pendiente → En progreso → Pendiente de validación → Completada; rechazo exclusivamente desde Pendiente de validación hacia En progreso con motivo. Prioridades: Baja, Media, Alta, con Media predeterminada. El bebedero opcional y el responsable pertenecen al campo de la tarea.
- **BR-006 — Conteos**: Contar recursos activos y usuarios únicos dentro del alcance elegido. Un peón asignado a dos campos del dueño se cuenta una vez en el total del equipo. «Tareas pendientes» del dueño incluye todas las no completadas, desglosadas por estado.
- **BR-007 — Conservación**: Eliminar un recurso lo retira de la operación activa sin borrar hechos históricos. No se elimina un campo con animales, bebederos o tareas abiertas ni un bebedero con tareas abiertas. Retirar accesos no concede acceso posterior al historial al peón.
- **BR-008 — Alertas**: Resolver una condición no elimina su antecedente. Leer una alerta no resuelve la condición. Notificaciones de tareas se conservan como eventos internos; no se tratan como condiciones persistentes de agua.

### Key Entities *(include if feature involves data)*

- **Cuenta**: Identidad, correo verificado, datos de perfil y rol único; un dueño posee campos y un peón recibe asignaciones.
- **Establecimiento**: Nombre, ubicación, superficie, descripción, dueño, límite de vigencia y cantidades derivadas; agrupa animales, bebederos, asignaciones, tareas, alertas, eventos y clima.
- **Bebedero**: Identificador, nombre o código, ubicación, capacidad máxima, estado operativo y campo; tiene lecturas de agua y puede asociarse a tareas y visitas.
- **Lectura de agua**: Bebedero, porcentaje y fecha y hora recibida; determina categoría, vigencia e historial, sin edición por usuarios.
- **Animal**: Identificador, nombre o código, especie, raza, edad, estado y campo; tiene posiciones y visitas, de las que deriva su ubicación actual y última visita.
- **Posición GPS**: Animal o bebedero asociado, coordenadas y fecha y hora de actualización recibida; las posiciones de animales mantienen antecedentes y permiten estimar visitas.
- **Visita estimada**: Animal, bebedero del mismo campo y fecha y hora de entrada en proximidad; no representa consumo comprobado.
- **Invitación**: Dueño emisor, correo destinatario, campos incluidos y fechas de emisión y vencimiento y estado Pendiente, Aceptada, Retirada o Vencida; su aceptación origina asignaciones. El vencimiento de una invitación ya aceptada no revoca las asignaciones obtenidas.
- **Asignación de peón**: Relación vigente entre peón y campo de un dueño; establece el acceso y la elegibilidad para tareas.
- **Tarea**: Título, descripción, prioridad, fecha límite, estado, campo, responsable (puede quedar sin asignar tras retirar su acceso) y bebedero opcional; conserva comentarios y transiciones.
- **Alerta o notificación interna**: Tipo, recurso o tarea, campo, momento, destinatarios autorizados y condición activa o resuelta cuando corresponde.
- **Evento de historial**: Tipo de evento, campo, recurso, fecha y hora, valores o transición y responsable cuando corresponde; mantiene referencias de recursos retirados.
- **Información climática**: Campo y ubicación de referencia, temperatura, humedad, condición, probabilidad de lluvia y referencia temporal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

Las métricas se verifican con datos de ejemplo válidos y conexión disponible; no dependen de dispositivos físicos. Los tiempos son objetivos iniciales adoptados para hacer verificable la experiencia.

- **SC-001**: Al menos 90% de usuarios de prueba de cada rol identifica un bebedero Bajo o Crítico, su ubicación y la antigüedad de su dato en menos de un minuto desde el dashboard, sin ayuda.
- **SC-002**: El 100% de casos de acceso fuera de alcance, cambio de rol incompatible y modificación manual de nivel o GPS se rechaza sin revelar ni alterar datos; se verifica con dos dueños y un peón con asignaciones cruzadas.
- **SC-003**: Al menos 95% de cambios de agua, GPS y estados asociados aparece en una vista abierta dentro de 30 segundos desde que el dato queda disponible, sin recarga manual. Las revocaciones retiran información visible dentro de ese mismo límite.
- **SC-004**: El 100% de pruebas en los límites 0%, 20%, 50%, 100% y justo antes, al cumplirse y después del tiempo configurado produce la categoría y vigencia definidas; las alertas aparecen dentro de 30 segundos de detectar la condición.
- **SC-005**: Al menos 90% de dueños de prueba crea un campo, incorpora un bebedero e invita un peón a los campos elegidos en menos de cinco minutos, sin asistencia.
- **SC-006**: Al menos 90% de peones de prueba completa en teléfono el avance de una tarea hasta Pendiente de validación en menos de dos minutos; el 100% de rechazos exige motivo y vuelve a En progreso.
- **SC-007**: El 100% de entradas de proximidad de prueba registra una sola visita por entrada; ninguna vista ni evento presenta esa visita como prueba de que el animal bebió.
- **SC-008**: En el 100% de dashboards de prueba, los conteos coinciden con los recursos y personas autorizados; el clima muestra los cuatro datos requeridos o una indicación explícita de indisponibilidad.
- **SC-009**: Los cinco tipos de historial requeridos son consultables y fechados en el 100% de recorridos de prueba, incluso después de eliminar un recurso; no son visibles para peones que perdieron acceso.
- **SC-010**: Al menos 90% de usuarios de prueba completa las consultas principales y acciones permitidas en escritorio, tablet y teléfono sin ayuda; al menos 80% de peones califica la claridad del nivel de agua, vigencia y tareas con 4 o 5 sobre 5.

## Assumptions

- El MVP consume datos de agua y GPS ya disponibles; disponer de lecturas identificadas y fechadas, relacionadas con el recurso y campo correctos, es una dependencia. No incluye captura, instalación ni comunicación con dispositivos físicos.
- El envío por correo de invitaciones a peones, verificación de cuenta y recuperación de contraseña constituye la excepción autorizada a la exclusión de notificaciones externas en el MVP. Las alertas de agua, GPS y tareas permanecen exclusivamente internas. El flujo de invitación depende de la disponibilidad del envío de correo; la verificación de identidad debe impedir aceptar invitaciones ajenas sin imponer aquí un mecanismo técnico.
- Se adopta la conservación de antecedentes durante todo el MVP, sin borrado automático ni recuperación del acceso revocado. No se exige exportación de historial.
- La desvinculación revoca el acceso inmediatamente y deja las tareas abiertas sin asignar; el dueño puede reasignarlas posteriormente. No se incorpora cancelación, reapertura de tareas completadas ni eliminación de tareas en el MVP.
- La ubicación administrativa puede definirse al crear un establecimiento o bebedero; ninguna acción administrativa puede modificar GPS proveniente de dispositivos. El estado operativo se trata como información disponible al incorporar el bebedero; su edición no es parte obligatoria del MVP.
- El detalle de proximidad se determinará en planificación y deberá fijar un rango verificable para las pruebas; el criterio de entrada y la diferenciación de visita frente a consumo ya son obligatorios.
- El clima actual y la probabilidad de lluvia para el día en curso dependen de información disponible para la ubicación del campo. Debe explicitarse el período de la probabilidad mostrada y cuándo se actualizó la información; no se exige pronóstico extendido.
- Las fechas incluyen referencia de zona horaria visible y consistente para evitar ambigüedades; la edad se expresa con unidad y la superficie con unidad de medida visible.
- No se exige operación sin conexión, migración de datos ni una aplicación móvil nativa. La experiencia web debe permitir los recorridos desde teléfono y mantener una terminología coherente para su posible evolución móvil.
- Se conserva la identidad visual existente conforme a la constitución. La planificación identificará las áreas afectadas y documentará los cambios visuales y las restricciones de organización del proyecto; esta especificación no selecciona tecnologías ni arquitectura.

### Scope Boundaries

**Incluido**: autenticación y roles; múltiples establecimientos; gestión y monitoreo de bebederos; animales y GPS; mapa; invitaciones enviadas por correo y múltiples asignaciones; tareas y validación; alertas internas; vigencia configurable; clima actual; historial; dashboards por rol y diseño adaptable.

**Futuro / fuera del MVP**: cálculo de deshidratación, sugerencias de rutas hacia bebederos, notificaciones externas por correo (salvo invitaciones a peones, verificación de cuenta y recuperación de contraseña), WhatsApp, SMS o push, integración directa con sensores, GPS, routers o dispositivos físicos y aplicación móvil nativa. Ninguna de estas funciones condiciona la aceptación del MVP.
