# US2 — Establecimientos

T035–T045 implementadas. Verificación 2026-10-13/14 en MySQL 8.4.11 aislado (`bebederos_phase456_test`, puerto 33306). Sin env operativo, correos reales ni despliegue.

- Contrato e integración: 12/12 pasan. CRUD, cantidades activas, aislamiento, escritura prohibida al peón, superficie/coordenadas/límite/zona IANA, dependencias, baja lógica, desactivación de asignaciones/campos invitados e invalidación del clima.
- Playwright `farms.spec.js`: 3/3 contra API real, 375/768/1280 px. Alta, configuración, cantidades cero, entradas inválidas, confirmación/baja y ausencia de desbordamiento horizontal. Capturas en test-results.
- Build Vite correcto; aviso existente de tamaño de bundle.

Cambio del límite deja una solicitud durable `freshness:farm:<id>` en WorkerStates; su consumo por alertas corresponde a US7. Se reutilizan colores, tarjetas y confirmación accesible existentes.
