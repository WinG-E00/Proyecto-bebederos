---
target: Panel, clima y ubicaciones desplegables
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/WinG/Documentos/Proyecto_bebederos/Proyecto-bebederos/frontend/mi-proyecto-shadcn/src/pages/InterfazDuenio/InterfazDuenio.jsx"
target_fingerprint: "sha256:31a4827ab7dfe6b5f105b9d6e8340c6b5f4d17e18732d15f60f8956dcce665eb"
target_path: /home/WinG/Documentos/Proyecto_bebederos/Proyecto-bebederos/frontend/mi-proyecto-shadcn/src/pages/InterfazDuenio/InterfazDuenio.jsx
timestamp: 2026-10-20T17-08-35Z
slug: c-pages-interfazduenio-interfazduenio-jsx-2eefe9f1
---
Method: dual-agent (A: /root/design_review · B: /root/evidence_review)

Panel, clima y ubicaciones: revisión de estructura

Veredicto: la identidad rural está presente, pero la composición funciona como inventario de funcionalidades. El objetivo debe ser reconocer qué requiere atención y revelar los detalles a demanda.

Heurísticas (0–4): estado 3; lenguaje real 3; control 2; consistencia 2; prevención 3; reconocimiento 2; eficiencia 2; minimalismo 1; recuperación 3; ayuda 2. Total 23/40, aceptable con cambios importantes.

Fortalezas: estados de carga y datos antiguos explícitos; enlaces mantienen establecimiento; lista alternativa al mapa disponible.

P1: estadísticas y alertas repetidas diluyen la prioridad. Consolidar resumen y dejar urgencias visibles. Comandos: distill, shape.
P1: todos los climas, mapa de 400px y lista completa se renderizan abiertos. Usar apartados con resumen y listado buscable/paginado. Comandos: distill, layout.
P1: navegación global y lateral duplican destinos y vocabulario. Unificar nombres y navegación. Comandos: shape, clarify.
P2: clima expone coordenadas temporales, fuente y modelo demasiado pronto. Mostrar condición, temperatura, lluvia y actualización; resto bajo detalle. Comandos: distill, clarify.
P2: lista de ubicaciones sin iconos ni búsqueda; coordenadas dominan. Icono con etiqueta, nombre y tipo; coordenadas en ficha. Comandos: layout, clarify.

Propuesta: selector y estado de actualización, bloque Necesita atención y resumen compacto siempre visibles. Debajo: Tareas y actividad, Bebederos y animales, Clima, Ubicaciones como desplegables independientes. Encabezados muestran conteos/estado incluso cerrados. Tareas inmediatas del peón abiertas inicialmente. Clima y ubicaciones cerrados. Mapa y Lista como vistas alternativas dentro de Ubicaciones. Listas con búsqueda, filtro por tipo y paginación; mapa inicializado al abrir. No ocultar alertas críticas. Mantener mapa abierto en página dedicada a mapas.

Carga cognitiva alta: duplicaciones, jerarquía débil y falta de divulgación progresiva. Alex debe recorrer contenido secundario; Sam atraviesa largas listas; Casey pierde acceso rápido a urgencias en móvil. La imagen rural aporta identidad pero ocupa espacio antes de tareas accionables. El recorrido termina en coordenadas en vez de resolución.

Detalles: controles desplegables con texto, chevron, foco, teclado y estado accesible. Iconos nunca reemplazan etiquetas. Barras decorativas sin denominador y títulos repetidos necesitan revisión.

Detector: 1 aviso overused-font, InterfazDuenio.css:14, Geist; bajo valor como señal y no demuestra defecto de accesibilidad. Cuatro componentes auxiliares sin hallazgos. Revisión visual mediante capturas de octubre 14–15 contrastadas con código; sin certificación de funcionamiento en vivo.

Preguntas: ¿todos los apartados cerrados o tareas abiertas al entrar? ¿aplicar primero panel o también páginas dedicadas de clima/mapa?
