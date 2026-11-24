// Trazos compartidos entre los componentes de ícono y los marcadores del mapa (que necesitan SVG en texto).
export const WATER_JUG_PATHS = [
  'M10 2h4',
  'M10.5 2v3.5',
  'M13.5 2v3.5',
  'M8 5.5h8a3 3 0 0 1 3 3V19a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8.5a3 3 0 0 1 3-3z',
  'M5 13.5c2.3-1.2 4.7-1.2 7 0s4.7 1.2 7 0',
  'M12 15.8c-.9 1.1-1.3 1.7-1.3 2.4a1.3 1.3 0 0 0 2.6 0c0-.7-.4-1.3-1.3-2.4z',
]
export const COW_PATHS = [
  'M9.5 6C9 4.4 7.8 3.2 6 3',
  'M14.5 6c.5-1.6 1.7-2.8 3.5-3',
  'M8 8.5 4.5 7.5a1.6 1.6 0 0 0-.5 3.1l4 .9',
  'm16 8.5 3.5-1a1.6 1.6 0 0 1 .5 3.1l-4 .9',
  'M8 13.5V9a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v4.5',
  'M10 17h.01',
  'M14 17h.01',
  'M10 10h.01',
  'M14 10h.01',
]
export const COW_RECT = { x: 7, y: 13, width: 10, height: 8, rx: 4 }

export function svgMarkup(paths, rect, { size = 20, color = 'white' } = {}) {
  const shapes = paths.map(d => `<path d="${d}"/>`).join('') + (rect ? `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" rx="${rect.rx}"/>` : '')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes}</svg>`
}
