import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../../src/hooks/useAuth.js'
// Entrada exclusiva de revisión: conserva intactos App.jsx y los paneles existentes.
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import InterfazDuenio from '../../src/pages/InterfazDuenio/InterfazDuenio.jsx'
import InterfazPeon from '../../src/pages/interfazPeon/InterfazPeon.jsx'

const role = new URLSearchParams(window.location.search).get('role')
createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={new QueryClient()}>
    <BrowserRouter>
      <AuthProvider>{role === 'owner' ? <InterfazDuenio /> : <InterfazPeon />}</AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>,
)
