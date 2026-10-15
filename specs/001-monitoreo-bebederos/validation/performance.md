# Carga piloto y actualización en vivo — SC-003 (T136)

Ejecutado el 2026-10-14 en la computadora de desarrollo (Windows 11, Node 24.16, MySQL 8.3 temporal de pruebas en loopback). API, worker y generador de carga corrían en la misma máquina, así que los valores son de referencia local, no del servidor del piloto.

## Carga de 20 usuarios concurrentes

`npm run load:pilot --prefix database -- --minutes=3` (`database/scripts/load-pilot.js`):

- Datos del piloto con `seed`: 2 dueños, peón compartido, 10 campos, 100 bebederos, 1.000 animales; más 17 peones de carga asignados a campos del piloto. Total 20 sesiones reales (login con CSRF y cookie).
- Cada usuario consulta como la interfaz, cada vista cada 10 s: `/troughs`, `/map`, `/dashboard`, `/alerts`.
- Cada 2 s llega una muestra nueva de agua o GPS a un recurso al azar; el worker real (proceso aparte, ciclo de 5 s) la procesa.
- A mitad de la carga el dueño A revoca a un peón de carga.

| Métrica | Resultado |
|---|---|
| Solicitudes | 1.428, todas 200 (0 errores, 0 límites) |
| Latencia `/troughs` | p50 11 ms · p95 17 ms · p99 24 ms · máx 32 ms |
| Latencia `/map` (hasta 660 marcadores) | p50 15 ms · p95 29 ms · p99 34 ms · máx 42 ms |
| Latencia `/dashboard` | p50 17 ms · p95 31 ms · p99 39 ms · máx 43 ms |
| Latencia `/alerts` | p50 9 ms · p95 14 ms · p99 20 ms · máx 27 ms |
| Cambios enviados | 75 (38 agua, 37 GPS) |
| Pares cambio-usuario autorizado | 208 |
| **Visibles en ≤30 s** | **100%** (agua 100%, GPS 100%); 0 nunca vistos |
| Tiempo hasta verse (desde la llegada del dato) | p50 7,6 s · p95 12,5 s · máx 14,5 s |
| Revocación | El peón dejó de ver el campo a los 3,1 s; acceso directo posterior 404 |
| Atraso del worker (recepción → procesado) | p50 2,6 s · p95 4,9 s · máx 5,0 s; 0 pendientes al final |
| Duración del último ciclo | 716 ms, sin error |
| Duplicados | 0 lecturas con la misma clave, 0 eventos de agua repetidos, 0 alertas activas duplicadas |

El tiempo hasta verse combina el ciclo del worker (≤5 s) y la consulta de la vista (cada 10 s), por eso el máximo teórico ronda 15 s, con margen frente al límite de 30 s.

## Vista abierta en el navegador

`frontend/mi-proyecto-shadcn/tests/e2e/live-updates.spec.js`, 3/3 a 375/768/1280 px con API y MySQL reales, sin recargar la página. Tiempo desde que el dato queda disponible hasta verse:

| Cambio | 375 px | 768 px | 1280 px |
|---|---|---|---|
| Nivel nuevo en Bebederos | 9,1 s | 9,6 s | 9,6 s |
| Categoría Normal → Crítico | 9,6 s | 9,1 s | 9,1 s |
| Resumen del dashboard (Crítico → Bajo) | 9,2 s | 9,2 s | 9,2 s |
| Marcador GPS nuevo en el mapa | 9,6 s | 9,6 s | 9,6 s |

Revocación con vista abierta: ver `security.md` (retiro dentro de 30 s).

## Pendiente para el piloto real

Repetir `load:pilot` en el servidor del piloto con su MySQL, HTTPS y 20 usuarios desde sus propias redes (el límite general de 600/min es por IP). No se ejecutó carga contra servidores externos.
