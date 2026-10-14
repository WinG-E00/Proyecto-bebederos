import AdministrativeForm from '../../components/AdministrativeForm.jsx'
const fields = [
  ['name', 'Nombre', 'text'],
  ['capacityLiters', 'Capacidad (litros)', 'number', 0.000001],
  [
    'operationalState',
    'Estado operativo',
    'text',
    null,
    null,
    ['Operativo', 'En mantenimiento', 'Fuera de servicio'],
  ],
  ['latitude', 'Latitud administrativa (opcional)', 'optionalNumber', -90, 90],
  ['longitude', 'Longitud administrativa (opcional)', 'optionalNumber', -180, 180],
]
export default function TroughForm(props) {
  return (
    <AdministrativeForm
      fields={fields}
      initial={{ operationalState: 'Operativo' }}
      label="Guardar bebedero"
      {...props}
    />
  )
}
