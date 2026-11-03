# Contexto de las interfaces de Proyecto Bebederos

Este conjunto describe las interfaces existentes para que otra IA comprenda el producto antes de trabajar en él. Explica pantallas, datos, acciones, roles, estados y relaciones entre módulos. No contiene una propuesta de rediseño ni instrucciones para generar una aplicación nueva.

La referencia funcional es el frontend en `frontend/mi-proyecto-shadcn/src`, especialmente su `App.jsx`. Revisión: 20 de octubre de 2026. La descripción se basa en el código y no en una sesión visual de la aplicación ejecutada.

## Lectura inicial

Proyecto Bebederos es una aplicación de monitoreo ganadero y gestión de campos. Un establecimiento agrupa animales, bebederos, tareas y permisos de acceso. Permite consultar mediciones de agua, posiciones GPS, alertas, clima y antecedentes, además de organizar el trabajo del personal.

Hay dos roles: el dueño administra sus establecimientos, recursos y equipo; el peón consulta los campos asignados y ejecuta sus tareas. Un peón puede tener accesos de distintos dueños. El rol proviene de la cuenta: no se elige al entrar al panel.

El nivel de agua, el estado operativo de un bebedero y la vigencia de sus mediciones son datos distintos. La última posición recibida no garantiza la ubicación presente. Una visita estimada a un bebedero indica proximidad y no acredita consumo. Los antecedentes se conservan cuando se retiran recursos.

## Documentos

- [Navegación y elementos compartidos](02-navegacion-y-elementos-compartidos.md).
- [Acceso y cuenta](01-acceso-y-cuenta.md): login, registro, verificación, recuperación, restablecimiento, aceptación de invitaciones y perfil.
- [Panel del dueño](03-panel-del-duenio.md).
- [Panel del peón](04-panel-del-peon.md).
- [Establecimientos](05-establecimientos.md).
- [Bebederos](06-bebederos.md).
- [Animales](07-animales.md).
- [Mapa](08-mapa.md).
- [Tareas y Mis tareas](09-tareas.md).
- [Equipo e invitaciones](10-equipo-e-invitaciones.md).
- [Alertas y notificaciones](11-alertas-y-notificaciones.md).
- [Clima](12-clima.md).
- [Historial y antecedentes](13-historial-y-antecedentes.md).
- [Interfaces y variantes no montadas](14-interfaces-no-montadas.md).

Para trabajar en un módulo, leer primero este archivo, el documento de navegación y el del módulo. Las interfaces no montadas están separadas para evitar confundir componentes antiguos con la aplicación activa.

## Recorridos que relacionan las interfaces

1. Dueño: registro → revisar correo → verificación → login → panel.
2. Recuperación: correo de recuperación → enlace → nueva contraseña → login.
3. Gestión: establecimientos → seleccionar campo → crear animales o bebederos → consultar fichas, mapa y antecedentes.
4. Incorporación: Equipo → enviar invitación → enlace del peón → registro o login → aceptación explícita → panel del peón.
5. Trabajo: dueño crea y asigna tarea → peón inicia → envía a validación → dueño aprueba o rechaza con motivo.
6. Monitoreo: panel → alertas → recurso afectado → antecedentes.
7. Ubicación: mapa o lista → abrir ficha del animal o bebedero.
8. Accesos: Equipo → editar campos asignados → confirmar → tareas abiertas sin responsable si se retira acceso → reasignar.

No hay controles físicos de válvulas, edición manual de telemetría, medición confirmada de consumo ni guardado offline expuestos por estas pantallas.
