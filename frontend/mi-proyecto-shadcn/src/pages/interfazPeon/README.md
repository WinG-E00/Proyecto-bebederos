# InterfazPeon

Componente React del panel de monitoreo para el peón. Incluye resumen, tarjetas de mediciones, mapa y modo oscuro. Está contenido en esta carpeta; no modifica ni integra `App` o las rutas existentes.

## Uso

```jsx
import InterfazPeon from './pages/interfazPeon'

// Demostración con registros y actualizaciones simulados, identificados en pantalla.
<InterfazPeon />

// Datos reales: el consumidor obtiene la medición desde su propia fuente.
<InterfazPeon
  bebederos={registros}
  usuario="Operador Campo"
  establecimiento="Estancia El Norte"
  onActualizar={async (id) => obtenerMedicion(id)}
  cargando={false}
  error=""
/>
```

## Props y registros

| Prop | Descripción |
| --- | --- |
| `bebederos` | Array de registros; por defecto usa `datosEjemplo`. Usar `[]` para un estado vacío. |
| `usuario` | Nombre visible; por defecto `Operador Campo`. |
| `establecimiento` | Nombre visible; por defecto `Estancia El Norte`. |
| `onActualizar` | Función `async (id)` que devuelve un objeto de medición parcial para combinar con el registro. Debe rechazar con un `Error` cuando falle. |
| `cargando` | Muestra el estado de carga y deshabilita actualizaciones; por defecto `false`. |
| `error` | Mensaje de error general; por defecto vacío. |

Esquema ilustrado por `datosEjemplo.js`:

```js
{
  id: 1,                         // Identificador único y estable
  ubicacion: 'Casa',
  porcentaje: 85,                 // Número: nivel de agua (%)
  temperatura: 22,                // Número: °C
  indiceHidratacion: 84,          // Número: índice (%)
  tiempoBebiendo: '1 min 48 s',
  visitasHoy: 6,
  ultimaVisita: '14:35',
  caravana: 2548,
  anioCaravana: 2024,
  lat: -26.215246,                // Número entre -90 y 90
  lng: -58.970338                 // Número entre -180 y 180
}
```

Las mediciones ausentes se muestran sin datos. Los porcentajes visibles en las tarjetas se limitan a 0–100. Un resultado como `{ porcentaje: 72, temperatura: 24 }` conserva los demás campos. Al reemplazar un registro desde las props, sus valores nuevos tienen prioridad sobre una actualización local anterior. Con registros reales y sin `onActualizar`, el botón queda deshabilitado; no se generan mediciones aleatorias.

El resumen deriva del array: bebederos con medición disponible, caravanas/años únicos observados y temperatura media disponible. No representa un censo total ni inventa latencia del servidor. El estado general indica atención si hay riesgo y sin datos si falta hidratación para evaluar todos los registros.

## Mapa y validación

El mapa utiliza Leaflet y teselas de OpenStreetMap: requiere conexión para cargar el mapa base. Omite coordenadas inválidas, muestra un aviso ante fallos de carga y conserva la atribución. Al desmontarse, libera el mapa y su observador de tamaño. El reloj no reconstruye marcadores ni restablece la vista.

Validaciones realizadas: ESLint, compilación del componente aislado y de la aplicación, y comprobación de límites de los helpers. No hubo navegador disponible: la apariencia y las interacciones en escritorio/móvil requieren verificación visual.
