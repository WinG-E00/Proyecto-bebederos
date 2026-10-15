# Revisión táctil, teclado y responsive (T134)

Ejecutada el 2026-10-14 con `frontend/mi-proyecto-shadcn/tests/e2e/accessibility-responsive.spec.js` (3/3) contra API y MySQL reales, a 375, 768 y 1280 px (375 con emulación táctil).

## Pantallas revisadas

- Públicas: Iniciar sesión, Registro, Recuperar acceso.
- Dueño: Panel, Establecimientos, Bebederos, Animales, Mapa, Tareas, Alertas, Clima, Equipo, Historial, Mi perfil.
- Peón: Panel, Establecimientos, Bebederos, Animales, Mapa, Mis tareas, Alertas, Clima, Mi perfil.

Cada pantalla con datos reales (campo, bebedero en Crítico, animal con GPS, tarea asignada).

## Criterios comprobados en cada pantalla

- Sin scroll horizontal de la página completa.
- Controles principales (botones, campos, selectores, navegación y enlaces de acción) de al menos 44 px de alto; botones también de 44 px de ancho. Un campo dentro de una etiqueta envolvente se mide por esa caja, que es el área táctil.
- Todo control con nombre accesible; campos con etiqueta asociada; imágenes con `alt`.
- Foco visible al navegar con Tab (contorno en el control o anillo del envoltorio con `:focus-within`).
- Estado del agua con texto además del color («Agua: 18% · Crítico»; barras con `aria-valuetext`).
- Errores: enviar formularios vacíos (login, nuevo establecimiento) los marca como inválidos con la validación del navegador; los errores del servidor se anuncian con `role="alert"` y `aria-invalid` (US1–US6).
- Acción táctil principal del peón: tocar «Iniciar tarea» habilita «Enviar a validación».

## Problemas encontrados y ajustes

La primera ejecución encontró controles por debajo de 44 px. Se corrigieron sin cambiar colores, tipografía ni disposición:

| Pantalla | Problema | Ajuste |
|---|---|---|
| Login y Registro (cabecera) | Enlaces «Iniciar sesión»/«Registrarse» de 35–40 px | `min-height: 44px` en `login.css` y `register.css` |
| Login y Registro | Botón «Mostrar contraseña» de 28×28 px | Área táctil de 44×44 px dentro del campo de 46 px, mismo ícono |
| Panel del dueño (barra lateral) | Enlaces Inicio/Bebederos/Peones/Alertas de 43 px en tablet y escritorio | `min-height: 44px` en `InterfazDuenio.css` |

Segunda ejecución: 0 problemas en las tres resoluciones.

## Comparación con la referencia visual

Respecto de `baseline.md` y las capturas previas se conservan la navegación verde, tarjetas, tipografía Geist, colores, fondo y modo oscuro de los paneles de dueño y peón. Los únicos cambios visibles de esta fase son el área táctil mayor de los enlaces y del botón de contraseña, y el retiro de los datos de ejemplo de hidratación del panel del peón (fase 11). Capturas de esta revisión: `screenshots/a11y-*.png`.

## Observación

El cierre de sesión está en la barra superior del Panel; las demás pantallas llegan al Panel desde la navegación principal. No se agregó un botón nuevo para no rediseñar la navegación; queda como sugerencia de usabilidad para la evaluación con usuarios.
