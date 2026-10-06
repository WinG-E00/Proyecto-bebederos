# Modelo de datos — MVP

**Estado**: Diseño para implementar en MySQL 8 mediante Sequelize; no contiene migraciones ejecutadas.

## Convenciones

Identificadores enteros positivos estables, claves foráneas explícitas y fechas UTC con precisión de milisegundos. `createdAt` y `updatedAt` en entidades administrativas; `deletedAt` para bajas lógicas. Correo normalizado con espacios externos retirados y comparación sin distinguir mayúsculas; único por cuenta. Nombres/códigos visibles no sustituyen el identificador ni necesitan unicidad global. Fechas recibidas de dispositivos son independientes de la fecha administrativa.

Coordenadas: latitud −90 a 90, longitud −180 a 180; ambas presentes o ambas ausentes. Superficie en hectáreas, edad en años y capacidad en litros, con unidades visibles. Porcentaje entre 0 y 100. Ninguna escritura administrativa acepta campos de telemetría. No almacenar totales como valores editables: derivarlos de recursos activos autorizados.

## Entidades y relaciones

| Entidad | Campos principales | Relaciones y validación |
|---|---|---|
| Cuenta | id, nombre, correo, hashContraseña, rol, correoVerificadoEn | Rol obligatorio `owner` o `worker`, nunca ambos. Correo único. Dueño posee campos; peón recibe asignaciones. Perfil editable no cambia rol/correo en el MVP. |
| Establecimiento | id, dueñoId, nombre, latitud, longitud, superficieHa, descripción, límiteAntigüedadMinutos, zonaHoraria, deletedAt | Un dueño; nombre no vacío; coordenadas válidas; superficie ≥ 0; límite entero positivo, 180 predeterminado; zona IANA válida. |
| Asignación | id, establecimientoId, peónId, activa, fechaRetirada | Par campo/peón único; peón de rol worker. Acceso solo si activa y campo no retirado. Mantener fila al revocar. |
| Bebedero | id, establecimientoId, nombreCódigo, latitud, longitud, origenUbicación, capacidadLitros, estadoOperativo, deletedAt | Un campo; capacidad > 0; origen ubicación `administrative` o `device`. Estados iniciales Operativo, En mantenimiento o Fuera de servicio, sin confundirlos con categoría de agua. |
| LecturaAgua | id, claveFuente, bebederoId, porcentaje, medidaEn, recibidaEn, procesadaEn, resultadoProcesamiento | Registro inmutable; claveFuente única. Rechazo de valores fuera de rango sin reemplazar última lectura válida. |
| Animal | id, establecimientoId, nombreCódigo, especie, raza, edadAños, estado, deletedAt | Un campo; identificación individual; edad ≥ 0, campos de texto obligatorios. Estado administrativo visible, no indicador calculado de deshidratación. |
| PosiciónAnimal | id, claveFuente, animalId, latitud, longitud, medidaEn, recibidaEn, procesadaEn, resultadoProcesamiento | GPS válido inmutable; claveFuente única. Fecha anterior no reemplaza la posición actual ni genera visita. |
| PosiciónBebedero | id, claveFuente, bebederoId, latitud, longitud, medidaEn, recibidaEn, procesadaEn | GPS de dispositivo de solo lectura cuando esté disponible. Coordenadas administrativas sirven cuando no existe ese origen. |
| EstadoMonitoreoAnimal | animalId, últimaPosiciónId, bebederoEnRangoId nullable | Una fila por animal. Mantiene estado de proximidad entre ciclos para no duplicar visitas. |
| EstadoMonitoreoBebedero | bebederoId, últimaLecturaId nullable, últimaPosiciónId nullable | Una fila por bebedero. Último valor válido independiente del estado administrativo. |
| VisitaEstimada | id, establecimientoId, animalId, bebederoId, posiciónId, visitadaEn | Animal y bebedero del mismo campo; una visita por posición/entrada; fecha de la posición. No acredita consumo. |
| Invitación | id, dueñoId, correoDestinatario, hashToken, emitidaEn, venceEn, estado, estadoEnvío, aceptadaPorId nullable | Token único; siete días exactos. Estados Pendiente, Aceptada, Retirada o Vencida; envío Pendiente, Enviado o Fallido separado de aceptación. |
| CampoInvitación | invitaciónId, establecimientoId, vigente | Par único. Campo del emisor. Retirarlo no cambia otras asignaciones. |
| Tarea | id, establecimientoId, título, descripción, prioridad, fechaLímite, estado, peónId nullable, bebederoId nullable, versión | Creación con peón activo; bebedero del mismo campo; prioridad Baja/Media/Alta, Media predeterminada. Responsable puede quedar nulo después de revocación. |
| EventoTarea | id, tareaId, establecimientoId, actorId, fecha, acción, estadoAnterior, estadoNuevo, responsableAnteriorId, responsableNuevoId, comentario | Registro inmutable. Motivo no vacío obligatorio al rechazar. Conserva responsables anteriores incluso después de reasignar. |
| Alerta | id, establecimientoId, tipoRecurso, recursoId, condición, mensaje, generadaEn, resueltaEn nullable, claveActiva nullable | Una clave única no nula por recurso/condición activa; al resolver pasa a null. MySQL permite múltiples null para episodios históricos. |
| NotificaciónInterna | id, establecimientoId, destinatarioId, tareaId nullable, tipo, mensaje, fecha, leídaEn nullable | Destinatario y dueño autorizado; lectura no resuelve una alerta física. No concede acceso al campo revocado. |
| EventoHistorial | id, establecimientoId, tipo, recursoId, actorId nullable, fechaEvento, detalles | Agua, GPS, visitas, alertas, tareas y bajas administrativas. Inmutable y filtrable; nunca guardar secretos. |
| TokenIdentidad | id, cuentaId, tipo, hashToken, venceEn, consumidoEn nullable | Verificación 24 horas; recuperación 30 minutos; único y de un solo uso. Recuperación invalida sesiones y otros tokens de recuperación. |
| Sesión | identificadorOpaco, datos, venceEn | Adaptador express-session/Sequelize. Cuenta y token CSRF; permisos se consultan en cada solicitud. |
| CorreoPendiente | id, invitaciónId nullable, destinatario, asunto, payloadCifrado, estado, intentos, próximoIntentoEn, enviadoEn nullable | Cola persistente. Payload cifrado con secreto separado; máximo tres reintentos automáticos. Retirar payload al enviar o vencer el token. |
| ClimaCache | establecimientoId, ubicaciónConsultada, datos, consultadoEn | Una fila por campo; 15 minutos; invalida al cambiar ubicación. Datos incluyen período de lluvia y fecha/modelo de referencia. |
| EstadoProceso | nombre, últimoCicloExitosoEn, últimaDuraciónMs, errorClasificado nullable | Señal de salud persistente sin secretos; no sustituye marcación individual de muestras. |

## Índices y consistencia

- Claves únicas: correo cuenta; campo/peón; invitación/campo; hash de tokens; claves de fuente; posición de visita; clave de alerta activa; fila de caché por campo.
- Índices: recursos por campo y baja lógica; tareas por campo/responsable/estado/fecha límite; muestras por recurso/fecha y pendientes; eventos por campo/fecha/tipo; alertas por campo/resuelta; correo por estado/próximo intento; sesiones por vencimiento.
- Claves foráneas conservan referencias. No aplicar borrado en cascada a hechos históricos. Cambios de metadatos no modifican timestamps de medición.
- Consultar paginadamente muestras/eventos; mapas usan solo posiciones actuales, no todo el historial.
- Para entrada existente de telemetría, mapear sus identificadores y fechas al modelo de muestras. Si el origen carece de clave, usar un identificador persistido asignado al registro; no deduplicar por porcentaje, porque lecturas iguales pueden ser legítimas.

## Estados y transacciones

**Tarea**: Pendiente → En progreso → Pendiente de validación → Completada. Solo peón responsable ejecuta las dos primeras transiciones; dueño aprueba o rechaza; rechazo retorna a En progreso con motivo. Reasignación de tarea abierta mantiene estado e incrementa versión. Completada no se reabre. Toda acción incluye versión esperada, registra evento y notificación cuando corresponda.

**Revocación**: en una transacción bloquear el campo/asignación, retirar acceso, desasignar tareas no completadas e incrementar sus versiones. Mantener eventos y responsables de tareas completadas. Otros dueños no se ven afectados.

**Invitación**: Pendiente → Aceptada, Retirada o Vencida. Aceptación exige cuenta peón del correo destinatario, token vigente y al menos un campo vigente del emisor. Crear/reactivar asignaciones y aceptar dentro de una transacción. Repetir aceptación no vuelve a activar accesos que después hayan sido revocados.

**Alerta**: sin episodio → Activa → Resuelta. Normal→Bajo/Crítico genera episodio; Bajo→Crítico resuelve Bajo y abre Crítico; Normal resuelve categoría. Desactualización independiente puede coexistir. Leer no resuelve.

**Muestras y visitas**: bloquear estado del recurso/campo, procesar muestra, conservar historial válido, actualizar último estado solo si es más reciente, registrar entrada de proximidad y marcar muestra procesada en una transacción. Radio inclusivo de cinco metros; primera posición dentro cuenta; permanecer no repite; salida/reentrada cuenta; más cercano y desempate por id. Muestras inválidas/futuras se clasifican y no alteran el estado actual.

## Baja y conservación

Baja lógica de animales/bebederos conserva muestras y visitas. No borrar bebedero con tareas abiertas. Campo se retira solo sin animales/bebederos activos ni tareas abiertas; desactiva asignaciones y campos de invitaciones, resuelve alertas. Su historial sigue disponible al dueño. El peón pierde acceso operativo e histórico al revocar su asignación. No hay purga automática del historial durante el MVP.
