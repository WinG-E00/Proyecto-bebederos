# InterfazPeon

Panel del peón con resumen, tarjetas de bebederos, mapa y modo oscuro. `App.jsx` lo monta en `/dashboard` para cuentas con rol peón y le pasa únicamente datos autorizados por la API (`/dashboard`, `/troughs`, `/map`).

## Uso

```jsx
<InterfazPeon
  usuario={account.name}
  establecimiento={scope.selected?.name || 'Campos asignados'}
  bebederos={troughs.map((t) => ({ ...t, porcentaje: t.waterLevel, ubicacion: t.name }))}
  animalCount={summary.animals}
  summary={summary}
  farmId={scope.farmId}
  center={scope.selected}
  cargando={false}
  error=""
  onActualizar={() => troughs.refetch()}
>
  {/* Detalles del resumen: tareas, clima y enlaces */}
</InterfazPeon>
```

## Props

| Prop | Descripción |
| --- | --- |
| `bebederos` | Bebederos activos autorizados, con `porcentaje`, `waterCategory`, `operationalState`, `lastUpdatedAt`, `freshness` y `capacityLiters`. `[]` muestra el estado vacío. |
| `summary` | Respuesta de `GET /api/v1/dashboard`: totales activos, agua Bajo/Crítico, alertas y tareas abiertas del peón. |
| `animalCount` | Censo de animales activos del alcance (no se infiere de caravanas ni muestras). |
| `usuario`, `establecimiento` | Textos visibles de la cuenta y del alcance. |
| `farmId`, `center` | Alcance y centro del mapa. |
| `onActualizar` | Vuelve a consultar las mediciones; sin función el botón queda deshabilitado. |
| `cargando`, `error` | Estados de carga y error. |

Las mediciones ausentes se muestran como «Sin medición» y el nivel visible se limita a 0–100 sin inventar ceros. El panel no muestra hidratación, tiempo bebiendo ni consumo: las visitas estimadas por proximidad no acreditan que el animal bebió.

## Mapa

El mapa usa Leaflet y teselas de OpenStreetMap (o `VITE_TILE_URL`), omite coordenadas inválidas, muestra un aviso ante fallos de carga y conserva la atribución.
