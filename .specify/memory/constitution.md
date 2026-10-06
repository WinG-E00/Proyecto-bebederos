<!--
Sync Impact Report
- Cambio de versión: plantilla sin versión → 1.0.0 (adopción inicial).
- Principios definidos: I. Gestión remota del campo; II. Conservación del diseño;
  III. Separación entre backend y frontend.
- Secciones añadidas: Alcance y organización; Desarrollo y revisión; Governance.
- Secciones eliminadas: espacios de ejemplo para principios 4 y 5, sin reglas adoptadas.
- Pendientes: ninguno.
- Informe temporal: retirar antes de confirmar la constitución en Git.
-->

# Proyecto Bebederos Constitution

## Core Principles

### I. Gestión remota del campo

El proyecto DEBE orientar sus funcionalidades a gestionar bebederos en el campo y consultar
su nivel de agua a distancia, sin estar físicamente presente. El alcance del producto incluye
bebederos con sensores de nivel de agua y GPS, y animales con GPS para consultar su ubicación.
Cada especificación DEBE indicar cómo contribuye a este propósito, para mantener el desarrollo
centrado en el problema que motivó el proyecto.

### II. Conservación del diseño

Los cambios del frontend DEBEN conservar la esencia del diseño principal existente: estilo
visual, composición, colores, tipografía y patrones de componentes. Las nuevas interfaces
DEBEN integrarse con estos patrones y reutilizar componentes y recursos cuando cubran la necesidad.

Se PERMITEN modificaciones necesarias para agregar interfaces, componentes o comportamientos.
Cada modificación DEBE documentar la necesidad que resuelve y limitarse a los elementos afectados.
Un rediseño general REQUIERE una instrucción explícita del responsable del proyecto.
Esta regla permite ampliar la aplicación manteniendo su identidad visual.

### III. Separación entre backend y frontend

La carpeta `database/` DEBE contener el backend con Express y la gestión de la base de datos:
conexiones, modelos, persistencia, controladores y rutas de la API. La carpeta `frontend/`
DEBE contener todo el frontend: interfaces, componentes, estilos, recursos y lógica del cliente.

El frontend DEBE acceder a los datos mediante la API del backend. Las conexiones a la base
de datos, sus credenciales y la lógica de persistencia DEBEN permanecer en `database/`.
Los componentes y estilos del frontend DEBEN permanecer en `frontend/`.
Esta separación establece responsabilidades claras entre presentación y acceso a datos.

## Alcance y organización

La estructura actual utiliza `database/` para Express y `frontend/mi-proyecto-shadcn/` para
la aplicación React. El desarrollo DEBE respetar esta distribución de responsabilidades.
Las herramientas existentes son el punto de partida; esta constitución no fija versiones
de dependencias, dispositivos ni protocolos de comunicación.

Las especificaciones de integración con sensores y GPS DEBEN definir los datos que consumen
y cómo se presentan. La selección de hardware, la frecuencia de lectura y el mecanismo de
envío se definen en la especificación y el plan de cada funcionalidad.

## Desarrollo y revisión

Antes de implementar una funcionalidad, la especificación y el plan DEBEN identificar las
carpetas afectadas y los cambios visuales necesarios. Cada revisión DEBE comprobar la relación
con el propósito del producto y la separación entre backend y frontend.

Para cambios visuales, la revisión DEBE comparar las interfaces afectadas con el diseño previo
y documentar los ajustes necesarios. La validación DEBE cubrir el comportamiento modificado;
si cambia la comunicación entre cliente y servidor, DEBE comprobarse el intercambio por la API.

## Governance

Las especificaciones, planes y tareas DEBEN respetar esta constitución. Cada revisión DEBE
comprobar los principios aplicables y resolver las discrepancias antes de dar el cambio por terminado.

Las enmiendas DEBEN registrar la regla modificada, el motivo y su impacto. Los cambios de
principios DEBEN responder a instrucciones explícitas del responsable del proyecto. Si afectan
funcionalidades existentes, DEBEN incluir una estrategia de adaptación. Cada enmienda DEBE
actualizar la versión y la fecha de última modificación, conservando la fecha de ratificación.

La versión sigue MAJOR.MINOR.PATCH: MAJOR para eliminar o redefinir reglas de forma incompatible;
MINOR para añadir principios o ampliar materialmente obligaciones; PATCH para aclaraciones o
correcciones sin cambios en las obligaciones. La versión 1.0.0 adopta las reglas iniciales
proporcionadas por el responsable del proyecto.

**Version**: 1.0.0 | **Ratified**: 2026-10-05 | **Last Amended**: 2026-10-05
