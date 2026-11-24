import { COW_PATHS, COW_RECT } from './iconPaths.js'

// Lucide no incluye una vaca; este ícono imita su estilo (24×24, trazo redondeado) para combinarse con el resto.
export default function CowIcon({ size = 24, strokeWidth = 2, color = 'currentColor', className, ...props }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {COW_PATHS.map(d => <path key={d} d={d} />)}
      <rect {...COW_RECT} />
    </svg>
  )
}
