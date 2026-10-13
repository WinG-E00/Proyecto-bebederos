// Entrada exclusiva de revisión: conserva intactos App.jsx y los paneles existentes.
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import InterfazDuenio from '../../src/pages/InterfazDuenio/InterfazDuenio.jsx'
import InterfazPeon from '../../src/pages/interfazPeon/InterfazPeon.jsx'

const role = new URLSearchParams(window.location.search).get('role')
createRoot(document.getElementById('root')).render(role === 'owner' ? <InterfazDuenio /> : <InterfazPeon />)
