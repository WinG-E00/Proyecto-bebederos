# CARPETA DEL PROYECTO DE INGENIERÍA DE SOFTWARE

## Proyecto Bebederos: monitoreo remoto de agua y tareas rurales

| Dato | Información |
| --- | --- |
| Institución, materia, integrantes y docente | A completar |
| Fecha | 16 de noviembre de 2026 |

# ÍNDICE

1. Presentación y fundamentación
2. Relevamiento y análisis
3. Requerimientos
4. Organización funcional
5. Conclusiones
6. Anexos

# PARTE I. PRESENTACIÓN Y FUNDAMENTACIÓN DEL PROYECTO

## Carátula

Proyecto Bebederos es una aplicación web para administrar establecimientos rurales, supervisar bebederos y animales, y organizar tareas entre dueños de campo y peones.

## Fundamentación del proyecto

### Contexto del proyecto

En un campo, revisar personalmente cada bebedero y ubicar animales requiere tiempo, recorridos y recursos. El sistema concentra la información de establecimientos, bebederos, animales, alertas, tareas, clima e historial para apoyar esa operación.

### Problemática o necesidad identificada

Los recorridos físicos frecuentes pueden demorar la detección de agua baja, mediciones antiguas o tareas pendientes. Además, sin una herramienta centralizada es difícil organizar el trabajo, conservar antecedentes y limitar la información que ve cada persona.

### Usuarios o destinatarios

| Usuario | Uso principal |
| --- | --- |
| Dueño de campo | Administra campos, recursos, equipo y tareas; consulta alertas, mapa, clima e historial. |
| Peón | Consulta los campos asignados y avanza sus propias tareas. |
| Responsable técnico | Configura operación, copias, seguridad, correo y monitoreo. |
| Animales | Son beneficiarios indirectos del mejor seguimiento de agua y ubicación. |

### Justificación de la solución informática

La aplicación permite priorizar revisiones con datos fechados y accesibles desde computadora, tableta o teléfono. Los permisos por establecimiento protegen la información y el historial conserva los hechos aunque un recurso deje de estar activo.

## Descripción general del software propuesto

### ¿En qué consiste la aplicación?

Es una aplicación web con interfaz React, API Express, base MySQL y un proceso de monitoreo. Gestiona establecimientos, bebederos, animales, invitaciones, tareas, alertas, clima e historial.

El MVP procesa lecturas de agua y posiciones GPS que ya están disponibles en MySQL. No integra directamente sensores, antenas ni LoRaWAN; esa integración física queda para una etapa futura.

### ¿Para qué servirá?

Permitirá conocer el estado de los bebederos y animales autorizados, detectar condiciones que requieren atención y coordinar tareas entre dueños y peones.

### Funcionamiento general

1. El dueño crea campos, recursos y tareas, e invita peones a campos determinados.
2. La base recibe registros disponibles de agua y GPS.
3. El proceso de monitoreo calcula niveles, vigencia, alertas y visitas estimadas.
4. La aplicación muestra la información actualizada, el mapa, el clima y el historial.
5. El peón avanza sus tareas y el dueño las aprueba o rechaza con un motivo.

~~~mermaid
flowchart LR
  D[Datos de agua y GPS] --> B[(MySQL)]
  B --> W[Proceso de monitoreo]
  W --> B
  B --> A[API REST]
  A --> U[Interfaz web]
  U --> O[Dueño y peón autorizado]
~~~

### Solución propuesta frente a la problemática

El sistema detecta niveles de agua Crítico, Bajo o Normal y diferencia un dato actual de uno desactualizado. Presenta alertas, ubicación, tareas e historial para que el personal decida qué revisar primero.

## Objetivos del proyecto

Mejorar la gestión de bebederos y tareas rurales mediante información centralizada, trazable y disponible según el rol de cada usuario.

### Objetivo general

Contribuir al bienestar animal y a la eficiencia operativa del establecimiento mediante el monitoreo remoto y la organización del trabajo.

### Objetivos específicos

- Centralizar campos, animales, bebederos, tareas y personal.
- Informar nivel de agua, fecha de lectura y vigencia.
- Alertar ante agua baja, crítica o datos antiguos.
- Ubicar recursos en un mapa y registrar visitas estimadas.
- Gestionar tareas, permisos e historial.
- Permitir el uso desde escritorio, tableta y teléfono.

## Beneficios esperados

### Optimización de procesos

Se priorizan los recorridos según alertas, recursos críticos y tareas pendientes.

### Organización de la información

Cada dato se relaciona con un establecimiento. El historial conserva lecturas, alertas, posiciones y acciones sobre tareas.

### Reducción de tiempos y errores

La actualización periódica evita recargas manuales. Las validaciones y permisos bloquean datos inválidos y acciones no autorizadas.

### Beneficios para los usuarios o la organización

Los dueños tienen una visión de sus campos y los peones consultan solamente la información necesaria para sus tareas.

# PARTE II. RELEVAMIENTO Y ANÁLISIS DE LA INFORMACIÓN

## Técnicas de recopilación de información

### Técnicas utilizadas

| Técnica | Resultado |
| --- | --- |
| Análisis de requisitos | Definición de historias de usuario, reglas de negocio, 38 requisitos funcionales y criterios de éxito. |
| Revisión documental | Arquitectura, modelo de datos, contratos, operación y validaciones del proyecto. |
| Observación técnica | Revisión de frontend, backend, workers, rutas, modelos y pruebas. |
| Pruebas con datos de ejemplo | Validación técnica de seguridad, carga, recuperación e interfaz. |

### Personas o sectores consultados

La documentación no registra entrevistas ni encuestas ejecutadas con dueños o peones. Antes de operar el piloto deben consultarse dueños, trabajadores rurales, responsables de telemetría y responsables técnicos.

### Información relevante obtenida

- El establecimiento agrupa recursos, permisos, tareas, alertas, clima e historial.
- Hay dos roles: dueño y peón. El acceso depende de asignaciones vigentes.
- El nivel de agua, el estado operativo y la vigencia son datos distintos.
- Una visita por GPS es una estimación de proximidad, no una prueba de consumo.
- El MVP no incluye instalación de sensores, captura física de telemetría ni trabajo sin conexión.

### Principales conclusiones del relevamiento

No basta con mostrar un porcentaje de agua: se necesita su fecha, vigencia, ubicación, permisos y acciones posteriores. La solución debe comunicar ausencia e incertidumbre sin inventar datos.

## Identificación y descripción de los procesos de negocio

### Identificación de los procesos de negocio

| Proceso | Participantes |
| --- | --- |
| Monitoreo de agua y GPS | Proceso de monitoreo, dueño y peón. |
| Gestión de campos y recursos | Dueño. |
| Gestión de equipo e invitaciones | Dueño, peón y correo. |
| Gestión de tareas | Dueño y peón. |
| Consulta de alertas, clima e historial | Usuarios autorizados. |

### Descripción de los procesos seleccionados

#### Nombre y propósito del proceso

**Monitoreo y atención de un bebedero:** transformar una lectura disponible en estado, alerta y, si corresponde, una tarea de intervención.

#### Actividades que lo componen

1. Llega una lectura o se detecta que la información está vencida.
2. El sistema valida y clasifica el dato.
3. Se crea o actualiza una alerta si existe una condición relevante.
4. El usuario autorizado consulta el detalle.
5. El dueño crea y asigna una tarea cuando es necesaria.
6. El peón la realiza y el dueño la valida.

#### Participantes involucrados

Fuente de datos, proceso de monitoreo, dueño, peón y sistema.

#### Diagrama BPMN del proceso

~~~mermaid
flowchart LR
  A[Lectura o vigencia] --> B[Validar y calcular estado]
  B --> C{¿Hay condición relevante?}
  C -- Sí --> D[Generar alerta] --> E[Dueño decide acción]
  E --> F[Asignar tarea] --> G[Peón realiza] --> H[Dueño valida]
  C -- No --> I[Actualizar historial]
  H --> I
~~~

# PARTE III. ANÁLISIS DE REQUERIMIENTOS

## Requerimientos funcionales (RF)

### Identificación de requerimientos funcionales

| Grupo | Requerimientos |
| --- | --- |
| Acceso y permisos | RF-001 a RF-004 |
| Establecimientos, bebederos, animales y mapa | RF-005 a RF-013 |
| Equipo e invitaciones | RF-014 a RF-017 |
| Tareas | RF-018 a RF-022 |
| Alertas y actualización | RF-023 a RF-029 |
| Clima, historial y experiencia | RF-030 a RF-038 |

### Descripción de los requerimientos funcionales

| Grupo | Descripción |
| --- | --- |
| Acceso | Registro de dueño, invitación para peón, sesión, perfil, rol único y permisos por campo. |
| Recursos | Gestión de campos, bebederos y animales; nivel de agua, GPS, visitas estimadas y mapa. |
| Equipo | Invitaciones por correo, asignaciones por campo, vencimiento y revocación de acceso. |
| Tareas | Creación, asignación, avance, aprobación, rechazo con motivo, reasignación e historial. |
| Alertas | Alertas por nivel bajo/crítico y datos antiguos; notificaciones internas y actualización sin recarga. |
| Contexto | Clima, historial, dashboards, validación de datos, diseño adaptable y confirmación de bajas. |

El detalle completo de RF-001 a RF-038 se encuentra en [spec.md](../specs/001-monitoreo-bebederos/spec.md).

## Requerimientos no funcionales (RNF)

### Seguridad

Sesiones persistentes, cookies seguras, CSRF, hash de contraseñas, permisos por establecimiento, límites de solicitudes e inmutabilidad de lecturas y GPS.

### Rendimiento

Actualización visible dentro de 30 segundos como objetivo; worker cada cinco segundos; paginación de historial. La prueba local documenta 20 usuarios concurrentes y 100 % de cambios visibles dentro del objetivo.

### Disponibilidad

API y worker separados, supervisables y reiniciables. La operación requiere HTTPS, SMTP, clima comercial, monitoreo de salud y copias de seguridad.

### Usabilidad

Interfaz revisada en 375, 768 y 1280 píxeles, controles táctiles de 44 px, foco visible y estados comunicados con texto. Falta la prueba con usuarios reales.

### Compatibilidad

Aplicación web con React, Vite y Tailwind; backend Node.js, Express, Sequelize y MySQL. Diseñada para navegadores modernos de escritorio, tableta y teléfono.

### Confiabilidad

Transacciones, versionado de tareas, deduplicación de muestras, historial persistente, baja lógica, cola de correo y procedimientos de restauración.

# PARTE IV. PROPUESTA DE ORGANIZACIÓN FUNCIONAL DEL SOFTWARE

## Identificación y descripción de los módulos del sistema

### Identificación de los módulos

| Módulo | Propósito | RF asociados |
| --- | --- | --- |
| Acceso y perfil | Gestionar cuenta, sesión y permisos. | RF-001 a RF-004 |
| Establecimientos | Organizar campos y configuración. | RF-005, RF-006, RF-025, RF-037, RF-038 |
| Bebederos y agua | Consultar niveles, vigencia y antecedentes. | RF-007 a RF-009, RF-023, RF-026, RF-027 |
| Animales y mapa | Gestionar animales, GPS y visitas estimadas. | RF-010 a RF-013 |
| Equipo e invitaciones | Gestionar peones y sus accesos. | RF-014 a RF-017 |
| Tareas | Organizar, avanzar y validar trabajos. | RF-018 a RF-022 |
| Alertas y notificaciones | Comunicar condiciones y cambios de tareas. | RF-023 a RF-029 |
| Clima | Mostrar contexto climático por campo. | RF-030 |
| Historial y dashboards | Consultar antecedentes y resúmenes autorizados. | RF-031 a RF-036 |
| Monitoreo y operación | Procesar muestras, correo, salud y copias. | RF-008, RF-011, RF-012, RF-023 a RF-031 |

### Descripción de los módulos

#### Nombre del módulo

Los módulos principales son Acceso, Establecimientos, Bebederos, Animales y mapa, Equipo, Tareas, Alertas, Clima, Historial y Monitoreo.

#### Propósito del módulo

Cada módulo concentra una responsabilidad funcional y aplica el permiso del usuario sobre los establecimientos que puede consultar o administrar.

#### Principales funcionalidades

Administrar recursos; visualizar telemetría e historial; gestionar usuarios y tareas; emitir alertas; consultar clima y mapa; procesar datos disponibles en forma periódica.

#### Requerimientos funcionales asociados

La tabla de identificación de módulos vincula cada módulo con los grupos de requisitos correspondientes.

### Esquema general de módulos del sistema

~~~mermaid
flowchart TB
  UI[Interfaz web] --> API[API REST]
  API --> MOD[Acceso, campos, recursos, equipo, tareas, alertas, clima e historial]
  MOD --> DB[(MySQL)]
  W[Worker de monitoreo y correo] --> DB
  W --> MOD
~~~

### Relación entre los módulos

El establecimiento relaciona los recursos, permisos, tareas, alertas, clima e historial. El equipo determina qué campos puede consultar un peón; las tareas solo se asignan a peones con acceso vigente. El worker actualiza estados y alertas a partir de datos disponibles, y los dashboards consolidan la información autorizada.

# PARTE V. CONCLUSIONES

## Conclusiones finales

Proyecto Bebederos centraliza información necesaria para supervisar el agua, animales y trabajo rural. La solución incorpora trazabilidad, permisos y alertas para apoyar decisiones de campo sin reemplazar la inspección física cuando sea necesaria.

La evidencia técnica del 14 de octubre de 2026 indica que el MVP fue implementado y validado con pruebas automatizadas. Su validación con usuarios reales continúa pendiente.

### Aprendizajes obtenidos durante el proyecto

- Un dato de agua debe incluir nivel, fecha y vigencia.
- Los permisos deben aplicarse en todas las consultas y acciones.
- Las tareas necesitan trazabilidad y control de cambios simultáneos.
- Las visitas estimadas no deben presentarse como consumo confirmado.

### Importancia del relevamiento de información

El relevamiento convierte una necesidad general en reglas comprobables: umbrales, vigencia, permisos, estados de tareas y conservación de antecedentes. La prueba con usuarios reales completará esta etapa.

### Dificultades encontradas y soluciones

| Dificultad | Solución |
| --- | --- |
| Acceso a datos de otros campos | Autorización por rol y establecimiento. |
| Alertas repetidas | Episodios únicos por recurso y condición. |
| Tareas simultáneas | Versionado y transacciones. |
| Revocación de acceso | Retiro inmediato y tareas abiertas sin responsable. |
| Recuperación operativa | Copias, restauración, sesiones SQL y procesamiento deduplicado. |

### Relación entre procesos de negocio, requerimientos y módulos

| Proceso | Módulos |
| --- | --- |
| Monitoreo de agua y GPS | Bebederos, Animales, Alertas, Monitoreo e Historial. |
| Gestión de recursos | Establecimientos, Bebederos y Animales. |
| Gestión de equipo | Acceso y Equipo e invitaciones. |
| Gestión de trabajo | Tareas, Alertas e Historial. |
| Consulta operativa | Dashboards, Clima y Mapa. |

### Aspectos pendientes para futuras etapas de diseño o desarrollo

1. Realizar evaluación con dueños y peones.
2. Repetir carga en el servidor del piloto.
3. Configurar SMTP, clima comercial, HTTPS, supervisión y copias productivas.
4. Integrar sensores, gateways y LoRaWAN u otra red de telemetría.
5. Evaluar aplicación móvil nativa, uso sin conexión y reportes exportables.

# ANEXO

## Cuestionario de entrevista

Preguntas propuestas para dueños y peones:

1. ¿Qué información necesita para priorizar la revisión de un bebedero?
2. ¿Comprende los estados Bajo, Crítico y Datos desactualizados?
3. ¿Puede realizar sus tareas principales sin ayuda desde su dispositivo habitual?
4. ¿Qué información falta para organizar o validar una tarea?
5. ¿Qué problemas de conectividad, pantalla o uso encuentra?

## Preguntas realizadas durante el relevamiento

No se registraron entrevistas realizadas. Deben confirmarse frecuencia de telemetría, tiempos de respuesta, prioridades de alerta, alcance de permisos y condiciones de uso en campo.

## Resultados de encuestas

No hay encuestas ejecutadas. Deben medirse identificación de alertas, creación de recursos, avance de tareas en teléfono y satisfacción de usuarios según la guía de usabilidad.

## Registros de observación

| Aspecto | Estado |
| --- | --- |
| Funciones, permisos e interfaz adaptable | Verificados técnicamente. |
| Rendimiento local y recuperación | Verificados técnicamente. |
| Comprensión y satisfacción de usuarios | Pendiente de medición. |

## Material complementario

- [Especificación funcional](../specs/001-monitoreo-bebederos/spec.md)
- [Plan técnico](../specs/001-monitoreo-bebederos/plan.md)
- [Modelo de datos](../specs/001-monitoreo-bebederos/data-model.md)
- [Matriz de aceptación](../specs/001-monitoreo-bebederos/validation/acceptance.md)
- [Guía de usabilidad pendiente](../specs/001-monitoreo-bebederos/validation/usability.md)
- [Operación y despliegue](../database/deployment/README.md)
