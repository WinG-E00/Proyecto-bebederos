import { useState } from 'react'
import { useFarmScope } from '../../hooks/useFarmScope.js'
import ResourceLayout from '../../components/ResourceLayout.jsx'
import FarmPicker from '../../components/FarmPicker.jsx'
import BoundaryEditor from '../../components/BoundaryEditor.jsx'
import CowIcon from '../../components/icons/CowIcon.jsx'
import WaterJugIcon from '../../components/icons/WaterJugIcon.jsx'
import MapaBebederos from '../interfazPeon/MapaBebederos.jsx'
import '../../components/ManagementUI.css'
import './Mapa.css'

export default function Mapa() {
  const scope = useFarmScope()
  const [api, setApi] = useState(null)
  const farms = scope.farms.data?.items ?? []
  return (
    <ResourceLayout title="Mapa" scope={scope} query={scope.farms} redesigned eyebrow="Ubicaciones"
      description="Límites de cada campo, última posición de los animales con GPS y ubicación de cada bebedero.">
      {scope.invalidScope ? (
        <p>No tenés acceso al establecimiento seleccionado.</p>
      ) : (
        <div className="map-page">
          <FarmPicker farms={farms} value={scope.farmId} onChange={scope.selectFarm} />
          <BoundaryEditor api={api} farm={scope.selected} />
          <div className="map-page-legend" aria-hidden="true">
            <span><i className="legend-trough"><WaterJugIcon size={14} strokeWidth={2.4} /></i>Bebedero</span>
            <span><i className="legend-animal"><CowIcon size={14} strokeWidth={2.4} /></i>Animal</span>
            <span><i className="legend-line" />Límite del campo</span>
            <span><i className="legend-line legend-line--approx" />Límite aproximado</span>
          </div>
          <div className="map-page-canvas">
            <MapaBebederos farmId={scope.farmId} center={scope.selected} farms={farms} onReady={setApi} />
          </div>
        </div>
      )}
    </ResourceLayout>
  )
}
