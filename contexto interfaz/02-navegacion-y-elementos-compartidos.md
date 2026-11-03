# Navegación y elementos compartidos

## Rutas y acceso

| Ruta | Interfaz | Acceso |
| --- | --- | --- |
| `/login` | Inicio de sesión | Sin sesión |
| `/register` | Registro de dueño | Sin sesión |
| `/verify` | Verificación de correo | Enlace de correo |
| `/forgot` | Recuperación de acceso | Formulario público |
| `/reset` | Restablecer contraseña | Enlace de correo |
| `/invite` | Aceptar invitación | Contempla sesión existente o registro |
| `/dashboard` | Panel según rol | Ambos roles |
| `/farms` | Establecimientos | Ambos roles |
| `/troughs` | Bebederos | Ambos roles |
| `/animals` | Animales | Ambos roles |
| `/map` | Mapa | Ambos roles |
| `/tasks` | Tareas o Mis tareas | Según rol |
| `/team` | Equipo e invitaciones | Dueño |
| `/alerts` | Alertas y notificaciones | Ambos roles |
| `/weather` | Clima | Ambos roles |
| `/history` | Historial general | Dueño |
| `/profile` | Perfil | Ambos roles |

El inicio `/` redirige al panel; `/registro` redirige a `/register`. Las rutas desconocidas vuelven al inicio. No hay página 404 independiente. Login y registro redirigen al panel si ya hay sesión. Una pantalla protegida sin sesión lleva a login; una restricción de rol lleva al panel. La comprobación de sesión puede mostrar carga o error con reintento.

## Navegación principal

Enlaces: Panel, Establecimientos, Bebederos, Animales, Mapa, Tareas, Alertas, Clima y Mi perfil. El dueño también tiene Equipo e Historial. Los enlaces conservan el establecimiento seleccionado mediante `farmId` cuando el módulo proporciona ese alcance.

El panel agrega una barra con nombre de usuario, rol, Mi perfil y Cerrar sesión. Durante la salida se muestra “Cerrando…” y se bloquea el botón; después se abre login. Perfil también permite cerrar sesión.

## Selector de establecimiento

Muestra campos accesibles y la opción “Todos los establecimientos”. Cambia el alcance consultado. Un peón solo opera sobre sus asignaciones. Un campo seleccionado sin acceso produce un aviso. Para crear animales, bebederos y tareas es necesario seleccionar un campo concreto; de lo contrario se muestra una indicación.

Equipo usa alcance de cuenta. Historial tiene un selector propio que también incluye campos retirados. Perfil no usa el selector.

## Listados, fichas y formularios

Animales, bebederos y tareas admiten `?id=…` para mostrar una ficha individual en el mismo módulo; el enlace puede incluir `farmId`. No son páginas de detalle con rutas separadas.

Los listados paginados muestran Anterior, número de página y Siguiente cuando hay más registros que el límite. Se deshabilitan las acciones en los extremos. Establecimientos presenta el conjunto disponible filtrado, sin ese paginador.

Los formularios administrativos se abren dentro de la pantalla, no en una ruta nueva. Tienen Guardar y Cancelar, estado Guardando, bloqueo de acciones durante el envío y errores generales o por campo. Las coordenadas respetan rangos de latitud −90 a 90 y longitud −180 a 180.

## Confirmaciones

Las bajas de recursos, el retiro de invitaciones y los cambios de asignación usan un diálogo con título, consecuencias, Cancelar y Confirmar. Durante la operación muestra “Procesando…” y bloquea las acciones. Si falla, mantiene el diálogo y muestra el error. Se puede cancelar con Escape cuando no está procesando. Al abrir enfoca Cancelar; al cerrar devuelve el foco al control anterior.

## Consulta y calidad de los datos

Las consultas pueden mostrar “Cargando…”, error con Reintentar y mensajes de lista vacía. Un error de acceso indica que ya no se tiene acceso a esos datos. Ante pérdida de conexión algunos módulos conservan datos anteriores con una advertencia; eso no implica que se puedan guardar cambios sin conexión.

La vigencia de telemetría distingue “Datos vigentes”, “Datos desactualizados” y “Sin datos recibidos”, con fecha si existe. Un valor ausente no se interpreta como cero. La fecha se presenta mediante el formateo local de la aplicación y, donde corresponde, la zona horaria del campo.

## Secciones del panel

Las secciones reutilizables muestran icono, título, descripción y flecha. Empiezan cerradas; el encabezado permite abrirlas o cerrarlas. Solo se monta el contenido interior mientras están abiertas. Se usan para tareas, recursos, clima, ubicaciones y mediciones del panel del peón.

## Marco visual actual

Las pantallas de acceso comparten logo, fotografía de ganado de fondo, panel de formulario y pie de marca. Los módulos operativos usan navegación verde oscuro, encabezados y tarjetas. El perfil usa el marco de acceso. Los paneles conservan controles de tema propios: no constituyen un cambio uniforme de tema para todas las rutas.
