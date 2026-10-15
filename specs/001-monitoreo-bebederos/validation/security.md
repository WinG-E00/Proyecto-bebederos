# Seguridad y aislamiento — SC-002 (T135)

Ejecutado el 2026-10-14 contra MySQL 8.3 exclusivo de pruebas (instancia temporal en 127.0.0.1:3310, sin datos operativos).

## Escenario

Dos dueños (A y B) y un peón asignado a un campo de cada uno, con bebederos, animales, tareas, lecturas y posiciones reales procesadas por el worker.

## Resultado: 100% de casos rechazados sin revelar ni alterar datos

| Caso | Verificación | Resultado |
|---|---|---|
| Rutas legacy `/api/user`, `/api/perfil`, `/api/bebederos` | 404 JSON, sin HTML | ✓ |
| Ruta desconocida bajo `/api/v1` | 401 sin sesión, 404 con sesión | ✓ |
| Dueño A pide campo, bebedero, tarea, clima, historial, dashboard, mapa y listados de B por id/filtro | 404 en todos; el nombre del campo de B no aparece | ✓ |
| Peón compartido | Ve ambos campos; en B solo su tarea | ✓ |
| Rol incompatible (peón crea campo/bebedero, elimina, edita animal, invita) | 403 y datos sin cambios | ✓ |
| Propiedades desconocidas (`waterLevel`, `position`, `lastVisit`, `ownerId`) | 422 | ✓ |
| Escritura manual de nivel por `PATCH/PUT/POST /troughs/:id` | Sin ruta (404) | ✓ |
| `UPDATE` directo en SQL sobre lecturas de agua y posiciones GPS | Trigger lo rechaza (`Immutable measurement`); la ficha conserva 40%/Bajo y la posición | ✓ |
| Serializers de cuenta, equipo, invitaciones, recursos, tareas, alertas, notificaciones, historial y dashboard | Sin `passwordHash`, `tokenHash`, `encryptedPayload` ni `password`; `account` = `{id,name,email,role}` | ✓ |
| CSRF | Escritura sin token o con token de otra sesión: 403 `CSRF_INVALID` | ✓ |
| Cookie de sesión | `bebederos.sid`, `HttpOnly`, `SameSite=Lax` (`Secure` con `NODE_ENV=production`, verificado en US1) | ✓ |
| Cabeceras | `Cache-Control: no-store` en `/api/v1`, sin `X-Powered-By`, `X-Content-Type-Options: nosniff` (Helmet) | ✓ |
| Límites | 429 `RATE_LIMITED` al superar el general por IP y el de identidad | ✓ |
| Salud pública | Solo `{status, database, time}`; con MySQL caído 503 sin mensaje del driver | ✓ |
| Revocación | Peón pierde inmediatamente campo, bebedero, tarea, historial y dashboard de B (404) y no puede actuar sobre su tarea | ✓ |

Prueba: `database/tests/integration/security.test.js` (9/9). Se suma a las pruebas previas de US1–US9 (identidad, revocación, tareas concurrentes, historial).

## Interfaz

`frontend/mi-proyecto-shadcn/tests/e2e/access-isolation.spec.js`, 3/3 a 375/768/1280 px con API y MySQL reales:

- Tras cerrar sesión el dueño A e iniciar el dueño B en el mismo navegador, no queda ningún dato de A en caché (campos, bebederos, dashboard).
- URL directa al campo de A (`/troughs?farmId=…`, `/dashboard?farmId=…`) muestra «No tenés acceso al establecimiento seleccionado.» sin el nombre del campo.
- Un peón con la vista abierta deja de ver el campo dentro del límite de 30 s tras revocarse su asignación, sin recargar.
- Sin scroll horizontal.

Los límites de identidad (30/15 min por IP) se mantuvieron en el código. Para correr muchas cuentas E2E seguidas desde 127.0.0.1 se usó un lanzador local con límites altos; el comportamiento 429 se prueba aparte en integración.
