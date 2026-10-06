# Contrato REST previsto — `/api/v1`

Documento de diseño. Las rutas siguientes se implementarán después de la planificación; no describen rutas ya disponibles.

## Convenciones

JSON, mismo origen frontend/API, cookie de sesión HttpOnly y token `X-CSRF-Token` en toda escritura. `GET /auth/csrf` establece el token antes de login/registro. Fechas ISO 8601 con zona UTC; id entero positivo. Listados: `page=1`, `limit=50` por defecto, máximo 100; respuesta `{items, total, page, limit}`. Filtros `farmId`, y donde corresponde tipo/período. No confiar en rol, dueñoId o campos de medición enviados por el cliente.

Recurso individual: objeto JSON; creación 201; operación sin representación 204. Error `{code, message, fields?}`: 401 sesión ausente, 403 rol/CSRF incompatible, 404 recurso ausente o fuera del alcance, 409 conflicto/dependencia/versión, 422 validación, 429 límite, 503 dependencia no disponible. No exponer stack, SQL, hash de contraseña ni token secreto. No revelar existencia de recursos ajenos.

## Acceso y perfil

| Método y ruta | Entrada | Resultado |
|---|---|---|
| GET `/auth/csrf` | — | `{csrfToken}` ligado a sesión |
| POST `/auth/register` | `{name, email, password, invitationToken?}` | `{account, needsVerification}`. Dueño público; peón solo con invitación válida del mismo correo |
| POST `/auth/login` | `{email,password}` | Sesión regenerada, `{account,csrfToken}` |
| GET `/auth/me` | Sesión | `{account}` sin información sensible |
| POST `/auth/logout` | Sesión/CSRF | Invalida sesión y cookie |
| POST `/auth/verify` | `{token}` | Consume enlace, habilita correo; no agrega asignaciones |
| POST `/auth/resend-verification` | `{email}` | Respuesta genérica; limita envío e invalida token de verificación anterior |
| POST `/auth/forgot` | `{email}` | Respuesta genérica indistinguible para cuentas ausentes |
| POST `/auth/reset` | `{token,password}` | Actualiza contraseña, invalida tokens y sesiones; requiere login posterior |
| PATCH `/profile` | `{name}` | Perfil actualizado; rol y correo no editables en MVP |

`account={id,name,email,role}`. Contraseña de al menos 10 caracteres y máximo 72 bytes UTF-8 para bcrypt. Registro no acepta un rol libre. Token invitación acredita el correo de nueva cuenta peón; login posterior y aceptación explícita completan el acceso.

## Campos y recursos

| Método y ruta | Rol | Comportamiento |
|---|---|---|
| GET `/farms` | Ambos | Campos activos autorizados, cantidades derivadas |
| POST `/farms` | Dueño | Crear campo propio |
| GET `/farms/:id` | Ambos | Datos de campo autorizado |
| PATCH `/farms/:id` | Dueño | Modificar administración/límite; reevaluar vigencia e invalidar clima si cambia ubicación |
| DELETE `/farms/:id` | Dueño | Baja lógica, verificando dependencias |
| GET `/troughs?farmId=` | Ambos | Lista permitida con última lectura, categoría, vigencia y última actualización |
| GET `/troughs/:id` | Ambos | Ficha autorizada |
| POST `/farms/:id/troughs` | Dueño | Crear datos administrativos; sin nivel/GPS de dispositivo editable |
| DELETE `/troughs/:id` | Dueño | Baja lógica si no hay tareas abiertas |
| GET `/animals?farmId=` | Ambos | Lista autorizada con posición vigente y última visita estimada |
| GET `/animals/:id` | Ambos | Ficha autorizada |
| POST `/farms/:id/animals` | Dueño | Crear datos administrativos |
| PATCH `/animals/:id` | Dueño | Editar administración, sin GPS/visita manual |
| DELETE `/animals/:id` | Dueño | Baja lógica conservando antecedentes |

Campo: `{name,latitude,longitude,areaHa,description,staleMinutes,timezone}`; límites/unidades en modelo. Bebedero: `{name,capacityLiters,operationalState,latitude?,longitude?}`; estas coordenadas son únicamente ubicación administrativa inicial. Animal: `{name,species,breed,ageYears,state}`. Rechazar propiedades desconocidas para evitar escritura accidental de telemetría.

Respuesta de bebedero: administración más `{waterLevel,waterCategory,freshness,lastUpdatedAt}`. Animal: administración más `{position:{latitude,longitude,measuredAt}|null,lastVisit:{troughId,troughName,visitedAt,estimated:true}|null,freshness}`. Null nunca se convierte en cero, ubicación ficticia ni afirmación de consumo.

## Equipo e invitaciones

| Método y ruta | Entrada/resultado |
|---|---|
| GET `/team` | Dueño: peones asociados y sus farmIds únicamente de ese dueño |
| PUT `/team/:workerId/assignments` | `{farmIds:[...]}`. Reemplaza las asignaciones de ese dueño, no las de terceros; lista vacía desvincula. Revoca y desasigna tareas abiertas atómicamente |
| GET `/invitations` | Dueño: destinatario, campos, estado, envío y vencimiento; nunca hash/token |
| POST `/invitations` | `{email,farmIds:[...]}`. Emite invitación y encola SMTP, no concede acceso |
| POST `/invitations/:id/retry` | Reintento de fallo SMTP sin extender plazo ni duplicar invitación |
| DELETE `/invitations/:id` | Retira invitación pendiente del dueño |
| GET `/invitations/preview?token=` | Público: `{valid:true}` si vigente, sin nombres/correos/campos privados |
| POST `/invitations/accept` | Peón: `{token}`. Correo coincide; acepta solo campos aún vigentes |

Token en enlaces no se registra en logs ni se conserva en el navegador después de completar el recorrido. Vencimiento exacto a siete días; aceptar repetidamente no duplica ni reactiva asignaciones retiradas después.

## Tareas, alertas e historial

| Método y ruta | Entrada/resultado |
|---|---|
| GET `/tasks?farmId=&state=` | Dueño ve sus campos; peón únicamente tareas propias dentro de campos vigentes |
| GET `/tasks/:id` | Mismo alcance, con comentarios/historial permitido |
| POST `/farms/:id/tasks` | Dueño: `{title,description,priority,deadline,workerId,troughId?}`; responsable con asignación vigente |
| POST `/tasks/:id/actions` | `{action,expectedVersion,reason?,workerId?}`; acciones `start`, `submit`, `approve`, `reject`, `assign` |
| GET `/alerts?farmId=&active=` | Alertas de campos autorizados; activas por defecto |
| GET `/notifications?farmId=` | Notificaciones internas del destinatario autorizado |
| POST `/notifications/:id/read` | Marca lectura sin resolver condiciones físicas |
| GET `/history?farmId=&type=&from=&to=` | Eventos paginados; dueño incluye sus campos retirados; peón solo alcance vigente y eventos de sus tareas |
| GET `/troughs/:id/history` | Agua/alertas autorizadas; dueño puede consultar recurso retirado |
| GET `/animals/:id/history` | Posiciones/visitas autorizadas; dueño puede consultar recurso retirado |

`expectedVersion` obligatorio en toda acción. El backend confirma versión y permisos vigentes dentro de transacción; 409 `STALE_TASK` exige consultar estado actualizado. Una versión nueva por cambio de estado/responsable. Rechazo exige comentario no vacío. Reasignación mantiene estado; revocación deja responsable null en tareas abiertas y conserva historial.

## Dashboard, mapa y clima

| Método y ruta | Resultado |
|---|---|
| GET `/dashboard?farmId=` | Totales autorizados, resumen bajo/crítico, alertas activas, tareas agrupadas y peones únicos para dueño |
| GET `/map?farmId=` | Marcadores actuales `{type,id,farmId,name,latitude,longitude}`; sin coordenadas inválidas |
| GET `/farms/:id/weather` | `{temperatureC,humidityPercent,condition,rainProbabilityPercent,rainPeriod,timezone,observedAt,fetchedAt,stale}` o `{unavailable:true}` |
| GET `/health` | Salud mínima de API sin secretos; detallar trabajador solo en monitoreo interno |

Clima: probabilidad máxima del día local, con período explícito. Caché por campo/ubicación de 15 minutos. Valores antiguos tienen `stale:true`; ausencia no se representa con cero.

No existen endpoints de escritura de agua/GPS para dueño o peón ni API pública de dispositivos en este MVP. Datos de telemetría se preparan externamente o mediante comandos limitados a desarrollo/pruebas.
