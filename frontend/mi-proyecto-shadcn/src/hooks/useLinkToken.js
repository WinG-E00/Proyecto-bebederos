import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// Toma el token del enlace (?token=) una sola vez, lo conserva solo en memoria y lo
// retira de la barra de direcciones y del historial. Nunca se guarda en el navegador.
export function useLinkToken() {
  const location = useLocation()
  const navigate = useNavigate()
  const [token] = useState(() => new URLSearchParams(location.search).get('token'))
  useEffect(() => {
    if (new URLSearchParams(location.search).has('token')) navigate(location.pathname, { replace: true, state: location.state })
  }, [location, navigate])
  return token
}
