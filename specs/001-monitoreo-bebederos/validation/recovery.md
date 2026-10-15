# Recuperación, reinicios y restauración (T137)

Ejecutado el 2026-10-14 contra MySQL 8.3 exclusivo de pruebas (instancia temporal, sin datos operativos).

## Reinicios sin pérdida ni duplicados

`database/tests/integration/recovery.test.js` (3/3), con los procesos reales `startServer` y `startWorker`:

- **API**: una sesión iniciada sobrevive al reinicio porque vive en MySQL (`/auth/me` responde con la misma cuenta) y `/api/v1/health` vuelve a responder `ok`.
- **Worker**: tres muestras recibidas con el worker detenido se procesan al iniciar, cada una una sola vez (3 eventos de agua, 1 alerta Crítica activa). Reenviar una muestra ya procesada con la misma clave de fuente y reiniciar de nuevo no crea lecturas, eventos ni alertas.
- **Correo**: un envío que falla queda pendiente con su payload cifrado y reintento a 1 minuto; dos procesadores nuevos (sin estado en memoria) lo retoman y lo envían una sola vez; luego el payload se elimina.
- Pruebas previas cubren además: worker único por base (bloqueo MySQL), cierre limpio con trabajo en curso, salud persistente y cola durable con reintentos 1/2/4 min.

## Copia y restauración ensayada

`database/scripts/backup.sh` sobre la base de pruebas (24 tablas, 12 triggers, 1.007 animales, 1.241 eventos):

| Paso | Resultado |
|---|---|
| `backup.sh` | Copia `.sql.gz` de 79 KB en 3 s, verificada con `gzip -t` |
| `backup.sh restore` en base vacía | Mismas cantidades en todas las tablas comparadas (cuentas, campos, bebederos, animales, lecturas, GPS, historial, alertas, tareas, sesiones, correo, migraciones) y 12 triggers |
| Inmutabilidad tras restaurar | `UPDATE` de una lectura rechazado por el trigger |
| Restaurar sobre la base de origen | Rechazado |
| Restaurar sobre una base con tablas | Rechazado |

## Límites documentados

- **SMTP**: un intento inicial y hasta tres reintentos (1, 2 y 4 minutos); después queda `failed` y el dueño puede reintentar la invitación sin extender su vencimiento. SMTP y MySQL no comparten transacción: si el proceso cae después de que el servidor SMTP aceptó y antes de confirmar en MySQL, el correo puede reenviarse una vez. La aceptación SMTP no acredita entrega al buzón. Los payload vencen con su token y se eliminan.
- **Procesamiento de datos**: cada muestra se marca procesada en la misma transacción que sus efectos (estado, historial, visitas, alertas), en lotes de hasta 500 por recurso; un corte a mitad revierte el lote y se retoma al reiniciar. Las muestras se deduplican por `sourceKey`, de modo que la fuente puede reenviar después de una restauración. Muestras más antiguas que la última vigente quedan como históricas sin reemplazarla.
- **Ventana de pérdida**: con copia diaria, lo cargado después de la última copia depende de que la fuente reenvíe sus muestras; cuentas, tareas y configuración posteriores se pierden. Si se requiere menos, habilitar binlog y copias incrementales (decisión de operación).
