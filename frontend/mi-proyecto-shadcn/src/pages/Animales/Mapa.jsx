import { useFarmScope } from '../../hooks/useFarmScope.js'
import ResourceLayout from '../../components/ResourceLayout.jsx'
import MapaBebederos from '../interfazPeon/MapaBebederos.jsx'
export default function Mapa() {
  const scope = useFarmScope()
  return (
    <ResourceLayout title="Mapa" scope={scope} query={scope.farms}>
      {scope.invalidScope ? (
        <p>No tenés acceso al establecimiento seleccionado.</p>
      ) : (
        <MapaBebederos farmId={scope.farmId} center={scope.selected} />
      )}
    </ResourceLayout>
  )
}
