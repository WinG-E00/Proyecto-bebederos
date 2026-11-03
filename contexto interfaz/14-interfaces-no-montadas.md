# Interfaces y variantes no montadas en la navegación activa

Estos componentes existen en el proyecto pero no representan pantallas alcanzables mediante el enrutador principal actual. Se describen para dar contexto completo sin atribuirles comportamiento activo.

## Bienvenida con selección de usuario

El componente `interfaz-principal` muestra logo, fotografía de ganado, bienvenida, pie y dos tarjetas: Dueño, con descripción de administración general, y Peón, con descripción de tareas y mantenimiento. Incluye botones Iniciar sesión y Registrarse.

Al seleccionar una tarjeta guarda la elección en el navegador y cambia al módulo de autorización. Los dos botones del encabezado también abren ese módulo. Esa selección visual no determina los permisos del sistema de cuentas actual.

## Selector antiguo de autorización

`AutorizationModule` presenta “Accedé a tu cuenta”, logo, fondo y botones “Logearse” y “Registrarse”. Cada acción sustituye su contenido por el componente de login o registro. Este selector no está montado en una ruta activa; las rutas actuales abren directamente las pantallas correspondientes.

## Variante completa del panel del dueño

Cuando no se usa la opción compacta, el componente del dueño incluye barra lateral con Inicio, Bebederos, Peones y Alertas; navegación por anclas y sección seleccionada; encabezado Dueño; control claro/oscuro con preferencia guardada; estado del sistema; fotografía; cantidades de bebederos, alertas y peones; lista de alertas y actividad reciente. Sus datos se reciben por propiedades y muestran textos o guiones cuando faltan.

El dashboard activo usa la variante compacta: oculta esa barra lateral y esas tarjetas, cambia el título a “Panel del campo” y muestra los bloques conectados descritos en el documento del panel del dueño. El control de tema permanece.

## Variante completa del panel del peón

Sin la opción compacta muestra cuatro tarjetas de resumen: Bebederos activos, Ganado monitoreado, Alertas activas y Estado general. Ese estado puede mostrar Atención, Sin datos o Normal según los registros disponibles. Incluye mediciones de bebederos y un mapa en una sección propia de ubicación en terreno.

La variante compacta activa oculta esas cuatro tarjetas y el mapa independiente, mantiene encabezado, fecha, hora, tema y tarjetas de mediciones, e integra los bloques conectados del dashboard. El mapa se encuentra dentro del bloque Ubicaciones. El tema del peón se maneja en el estado del componente.
