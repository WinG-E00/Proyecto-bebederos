import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import './PanelSection.css'

export default function PanelSection({ title, description, icon: Icon, children, enabled = true }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  if (!enabled) return children
  return <section className="panel-section">
    <h2 className="panel-section__heading">
      <button type="button" className="panel-section__toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <Icon size={22} aria-hidden="true" />
        <span className="panel-section__label"><span>{title}</span><small>{description}</small></span>
        <ChevronDown size={20} aria-hidden="true" className="panel-section__chevron" />
      </button>
    </h2>
    <div id={id} hidden={!open} className="panel-section__content">{open ? children : null}</div>
  </section>
}
