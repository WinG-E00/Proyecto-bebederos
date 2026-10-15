# Matriz final de aceptación (T143)

Revisión del 2026-10-14. **El MVP no se declara completo**: SC-001, SC-005 y SC-010 (y la parte de usuarios de SC-006) dependen de la evaluación con usuarios reales (T140), que no se ejecutó. Todo lo demás está implementado y verificado con pruebas automatizadas contra MySQL de pruebas y navegador real.

Leyenda: ✓ verificado · ◐ verificado en parte, falta dato medido · — pendiente.

## Requisitos funcionales

| Requisito | Estado | Evidencia |
|---|---|---|
| FR-001 Registro dueño / peón por invitación | ✓ | [US1](US1.md), `auth.test.js`, `auth.spec.js` |
| FR-002 Verificación, sesión, recuperación, perfil sin cambio de rol | ✓ | [US1](US1.md) |
| FR-003 Interfaz y acciones por rol | ✓ | [US1](US1.md), [security](security.md) (403 por rol) |
| FR-004 Alcance en todas las consultas, aun con acceso directo | ✓ | [security](security.md), `access-isolation.spec.js`, `foundational.test.js` |
| FR-005 CRUD de establecimientos con conservación | ✓ | [US2](US2.md) |
| FR-006 Cantidades activas y agrupación por campo | ✓ | [US2](US2.md), [US9](US9.md) |
| FR-007 Bebederos por rol | ✓ | [US3](US3.md) |
| FR-008 Nivel 0–100, categoría, fecha, estado operativo separado | ✓ | [US3](US3.md), `water.test.js` |
| FR-009 Nivel/GPS no editables | ✓ | [US3](US3.md), [security](security.md) (422, sin ruta, trigger SQL) |
| FR-010 CRUD de animales | ✓ | [US4](US4.md) |
| FR-011 GPS actual, fecha y última visita de solo lectura | ✓ | [US4](US4.md) |
| FR-012 Una visita estimada por entrada, sin afirmar consumo | ✓ | [US4](US4.md), `proximity.test.js` |
| FR-013 Mapa con marcadores, selección y centrado | ✓ | [US4](US4.md) |
| FR-014 Invitación por correo a campos elegidos | ✓ | [US5](US5.md) |
| FR-015 Peón acumula invitaciones de varios dueños | ✓ | [US1](US1.md), [US5](US5.md) |
| FR-016 Equipo, asignaciones y desvinculación | ✓ | [US5](US5.md) |
| FR-017 Estados y vencimiento de invitaciones | ✓ | [US5](US5.md) |
| FR-018 Crear y asignar tareas | ✓ | [US6](US6.md) |
| FR-019 Flujo del peón | ✓ | [US6](US6.md) |
| FR-020 Validación del dueño, rechazo con comentario | ✓ | [US6](US6.md) |
| FR-021 Historial de transiciones y conflicto de versión | ✓ | [US6](US6.md) |
| FR-022 Reasignación y revocación de responsables | ✓ | [US6](US6.md), [US9](US9.md) |
| FR-023 Alertas Bajo/Crítico y desactualización | ✓ | [US7](US7.md) |
| FR-024 Notificaciones internas de tareas | ✓ | [US6](US6.md), [US7](US7.md) |
| FR-025 Vigencia configurable por campo | ✓ | [US7](US7.md) |
| FR-026 «Datos desactualizados» con último valor | ✓ | [US7](US7.md) |
| FR-027 Episodios de alerta | ✓ | [US7](US7.md), [performance](performance.md) (0 duplicadas) |
| FR-028 Actualización automática sin recarga | ✓ | [performance](performance.md), `live-updates.spec.js` |
| FR-029 Errores y pérdida de conexión sin inventar datos | ✓ | [US3](US3.md), [US4](US4.md), [US8](US8.md) |
| FR-030 Clima por campo o indisponibilidad | ✓ | [US8](US8.md) |
| FR-031 Historial de cambios | ✓ | [US9](US9.md) |
| FR-032 Consulta y filtros de historial por rol | ✓ | [US9](US9.md) |
| FR-033 Dashboard del dueño | ✓ | [US9](US9.md) |
| FR-034 Dashboard del peón | ✓ | [US9](US9.md) |
| FR-035 Pantallas por rol | ✓ | [US9](US9.md), [visual-review](visual-review.md) |
| FR-036 Uso completo en escritorio, tablet y teléfono | ✓ | [visual-review](visual-review.md) |
| FR-037 Validación de datos administrativos | ✓ | [US2](US2.md), [US3](US3.md), [US4](US4.md), [security](security.md) |
| FR-038 Confirmación de eliminaciones y desvinculaciones | ✓ | [US2](US2.md), [US5](US5.md) |

## Criterios de éxito

| Criterio | Estado | Evidencia |
|---|---|---|
| SC-001 Identificar Bajo/Crítico en <1 min (usuarios) | — | [usability](usability.md): sin datos |
| SC-002 100% de accesos fuera de alcance rechazados | ✓ | [security](security.md) |
| SC-003 ≥95% de cambios visibles en ≤30 s | ✓ local · ◐ piloto | [performance](performance.md): 100% con 20 usuarios en local; repetir en el servidor del piloto |
| SC-004 Límites 0/20/50/100 y de tiempo; alertas ≤30 s | ✓ | [US3](US3.md), [US7](US7.md) |
| SC-005 Dueño crea campo, bebedero e invitación en <5 min (usuarios) | — | [usability](usability.md): sin datos |
| SC-006 Peón avanza tarea en teléfono en <2 min; rechazo exige motivo | ◐ | Rechazo 100% verificado ([US6](US6.md)); tiempos con usuarios sin datos |
| SC-007 Una visita por entrada, nunca como prueba de consumo | ✓ | [US4](US4.md) |
| SC-008 Conteos del dashboard y clima | ✓ | [US8](US8.md), [US9](US9.md), `seed.test.js` |
| SC-009 Cinco tipos de historial, también tras eliminar; no para revocados | ✓ | [US9](US9.md) |
| SC-010 Uso sin ayuda en tres dispositivos y calificación ≥4 | ◐ | Requisitos técnicos verificados ([visual-review](visual-review.md)); usuarios sin datos |

## Constitución

| Principio | Revisión |
|---|---|
| I. Gestión remota del campo | Cumple: agua, GPS, visitas, alertas, tareas, clima e historial sin inspección física; sin sensores ni integración de hardware. |
| II. Conservación del diseño | Cumple: paneles, colores, tipografía, tarjetas y modo oscuro conservados; cambios visibles de esta fase limitados a áreas táctiles de 44 px y retiro de datos de ejemplo de hidratación ([visual-review](visual-review.md)). |
| III. Separación backend/frontend | Cumple: modelos, credenciales, API, worker, seed, carga y copias en `database/`; interfaz y consultas HTTP en `frontend/mi-proyecto-shadcn/`. Las pruebas E2E importan helpers de `database/tests` solo para preparar datos. |
| Validación del intercambio | Cumple: contratos e integración por endpoint, E2E con API real. |

## Para cerrar el MVP

1. Ejecutar la evaluación con usuarios ([usability](usability.md)) y completar SC-001, SC-005, SC-006 y SC-010.
2. Repetir `load:pilot` en el servidor del piloto.
3. Configurar SMTP, clima comercial, HTTPS, supervisión y copias según `database/deployment/README.md`.
