# Contrato de interfaz — MVP

**Estado**: Comportamientos que deberán verificarse durante implementación. Reutilizar diseño y recursos existentes, sin rediseño general.

## Navegación y acceso

Rutas públicas: `/login`, `/register`, `/invite?token=`, `/verify?token=`, `/forgot`, `/reset?token=`. Rutas autenticadas: `/dashboard`, `/farms`, `/troughs`, `/animals`, `/tasks`, `/alerts`, `/weather`, `/profile`; dueño además `/team` y `/history`. Peón accede a campos desde dashboard y selector, sin administración.

Registro público no permite elegir peón; invitación presenta creación de cuenta o inicio de sesión y aceptación explícita. Cuenta dueño no puede aceptar como peón. Formularios recuperan errores conservando entradas no sensibles, nunca vuelven a mostrar contraseña. Vencimiento, retiro y fallo de correo tienen mensajes concretos y no conceden acceso.

Autorización final reside en API. Ocultar botones no sustituye controles de servidor. Al cerrar sesión limpiar caché y mapa; al cambiar cuenta ninguna información anterior permanece visible.

## Vistas por rol

Dueño: dashboard con establecimientos, animales, bebederos, bajos/críticos, alertas, tareas abiertas por estado, equipo único, clima y mapa. Administración de campos, recursos y equipo; tareas actuales/históricas; validación y rechazo con motivo obligatorio; historial filtrable; perfil y límite de antigüedad por campo.

Peón: dashboard con campos asignados, tareas propias pendientes/en progreso/en validación, recursos visibles, alertas, clima y mapa. Solo acciones de avance de sus tareas. Bebederos/animales consultables con antecedentes permitidos. Perfil sin edición de rol.

Las tareas sin responsable quedan claramente señaladas al dueño para reasignar. Al revocar acceso no se requiere otro peón disponible; los completados conservan atribución histórica.

## Estados de datos y acciones

- Carga: indicador comprensible, botones de envío deshabilitados mientras se procesa; no inventar cifras durante carga.
- Vacío: cantidades cero, mensaje contextual y acción permitida para crear/invitar cuando corresponde.
- Error: mensaje con posibilidad de reintento; error de permisos retira contenido, error de conexión conserva último dato con su fecha.
- Agua: porcentaje de solo lectura, Normal/Bajo/Crítico según límites; estado operativo separado; nunca mostrar control de edición del nivel.
- Vigencia: «Datos desactualizados» y fecha/hora; ausencia «Sin datos recibidos» sin fecha ficticia.
- Animal: GPS de solo lectura; «Última visita al bebedero», fecha/hora e indicación estimada; «Sin visitas registradas» cuando corresponde. Retirar mensajes de supuesta bebida/hidratación de ejemplos antiguos.
- Tareas: transición autorizada, comentario obligatorio en rechazo; conflicto 409 muestra datos nuevos y exige revisar antes de intentar de nuevo, sin repetir automáticamente la acción.
- Eliminación/desvinculación: confirmación explícita con consecuencias y dependencias; mensaje si la operación no puede completarse.

## Mapa y actualización

Marcadores visualmente distintos para agua/animales con identificación textual; seleccionar abre ficha correspondiente. Filtrar/centrar por campo autorizado; sin GPS válido no hay marcador y la ficha informa ausencia. Actualizaciones no reconstruyen el mapa ni pierden zoom/pan; cambiar campo centra explícitamente.

Consultar dinámicos cada diez segundos en vista visible; recuperar al volver al foco/conexión. Actualizar categoría, vigencia, alertas, resúmenes y marcadores. Cambios de permisos retiran datos visibles dentro de 30 segundos en vista activa/conectada; API deniega nuevas consultas y acciones inmediatamente.

No guardar datos sensibles de cuenta anterior en almacenamiento persistente; tema oscuro puede persistirse localmente como en el diseño existente.

## Adaptación y accesibilidad

Verificar anchos de 375, 768 y 1280 px, sin scroll horizontal de toda la página. Controles táctiles principales de al menos 44 px; etiquetas visibles en formularios, foco por teclado y mensajes de error asociados al campo. No depender exclusivamente del color para estado o tipo de marcador. Listas y fichas permanecen utilizables aunque fallen teselas.

Conservar colores, tipografía Geist, fotografías/logos, modo oscuro y composición de paneles; documentar ajustes de navegación y nuevas secciones con comparación antes/después. Los detalles de sesión, caché, procesos y librerías no aparecen en recorridos del producto.
