# Evaluación con usuarios — SC-001, SC-005, SC-006, SC-010 (T140)

**Estado: pendiente.** Requiere personas reales de ambos roles; no se ejecutó y no hay datos medidos. Las pruebas automatizadas (E2E, tiempos de recorridos) no reemplazan esta evaluación ni la satisfacción declarada por usuarios.

## Protocolo preparado

Entorno: aplicación desplegada o local con `npm run seed` (datos del piloto), un dueño y un peón por participante, sin ayuda durante las tareas. Registrar por participante: rol, dispositivo (teléfono/tablet/escritorio), tiempo por tarea, éxito sin ayuda (sí/no) y comentarios.

| Criterio | Tarea | Meta |
|---|---|---|
| SC-001 | Desde el dashboard, identificar un bebedero Bajo o Crítico, su ubicación y la antigüedad del dato | ≥90% de cada rol en <1 min sin ayuda |
| SC-005 | Dueño: crear un campo, agregar un bebedero e invitar un peón a los campos elegidos | ≥90% en <5 min sin ayuda |
| SC-006 | Peón en teléfono: llevar una tarea de Pendiente a Pendiente de validación | ≥90% en <2 min; 100% de rechazos con motivo vuelve a En progreso (ya verificado automáticamente) |
| SC-010 | Consultas principales y acciones permitidas en teléfono, tablet y escritorio | ≥90% sin ayuda |
| SC-010 | Peones califican claridad de nivel de agua, vigencia y tareas (1–5) | ≥80% con 4 o 5 |

Muestra sugerida: al menos 5 dueños y 5 peones (con 5 participantes, 90% exige 5/5).

## Resultados

| Participante | Rol | Dispositivo | SC-001 | SC-005 | SC-006 | SC-010 | Calificación |
|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — |

Sin datos: completar al ejecutar la evaluación.

## Referencia automatizada (no sustituye la evaluación)

Recorridos E2E de US2, US5 y US6 completan en teléfono las mismas acciones (crear campo/bebedero, invitar, avanzar tarea, rechazo con motivo obligatorio), lo que confirma que son posibles, no que sean comprensibles para usuarios nuevos.
