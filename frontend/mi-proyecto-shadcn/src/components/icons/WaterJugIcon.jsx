import { WATER_JUG_PATHS } from './iconPaths.js'

// Bidón de agua para bebederos, con el mismo estilo de trazo que Lucide.
export default function WaterJugIcon({ size = 24, strokeWidth = 2, color = 'currentColor', className, ...props }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {WATER_JUG_PATHS.map(d => <path key={d} d={d} />)}
    </svg>
  )
}
