# InterfazDuenio

Panel del dueño basado en la referencia original: barra lateral verde, estado del
sistema, fotografía del campo, métricas, alertas y actividad. Usa los recursos
compartidos de `interfaz-principal` y estilos limitados a `.interfaz-duenio`.

La carpeta de referencia conserva imágenes y scripts, pero no el HTML ni el CSS.
La estructura se recuperó del historial local, commit `536c73a`, archivos
`interfaz-duenio.html`, `interfaz-duenio.css` e `interfaz-duenio.js`.

```jsx
import InterfazDuenio from '@/pages/InterfazDuenio'

function MiPagina() {
  return <InterfazDuenio />
}
```

Sin props muestra los datos de ejemplo de la referencia, identificados en pantalla.
Para mostrar datos reales, pasar un objeto `datos`:

```jsx
<InterfazDuenio
  datos={{
    estado: 'Estado no disponible',
    estadoOptimo: false,
    totalBebederos: 0,
    totalPeones: 0,
    alertas: [],
    actividad: [],
  }}
/>
```

Cada alerta y evento de actividad tiene `{ id, mensaje }`. Las listas vacías
muestran su estado correspondiente. El componente no realiza peticiones al servidor.

La navegación apunta a las secciones del resumen. Si se proporciona
`onNavigate(seccion)`, delega la navegación a ese callback; los identificadores son
`inicio`, `bebederos`, `peones` y `alertas`.

El modo oscuro se guarda con la clave `modo` de `localStorage`, como en la
referencia, y se aplica únicamente al panel. La distribución se adapta a escritorio,
tablet y celular, con foco visible para navegación mediante teclado.

Validación: ESLint de la carpeta y compilación independiente con Vite. No se
realizó una inspección visual en navegador en este entorno.
