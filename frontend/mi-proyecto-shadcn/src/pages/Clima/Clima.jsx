import ResourceLayout from '../../components/ResourceLayout.jsx'
import WeatherCard from '../../components/WeatherCard.jsx'
import { useFarmScope } from '../../hooks/useFarmScope.js'
export default function Clima() {
 const scope=useFarmScope()
 const farms=scope.selected?[scope.selected]:(scope.farms.data?.items??[])
 return <ResourceLayout title="Clima por establecimiento" scope={scope} query={scope.farms}>
  {!scope.farms.isPending&&!farms.length&&<p>No hay establecimientos disponibles.</p>}
  <div className="grid gap-4 md:grid-cols-2">{farms.map(f=><WeatherCard key={f.id} farm={f}/>)}</div>
 </ResourceLayout>
}
