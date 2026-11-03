# Bebederos

Ruta: `/troughs`.

Listado paginado y vista individual con nombre, capacidad en litros, estado operativo, nivel porcentual y categoría del agua, vigencia, fecha de actualización, coordenadas y origen de ubicación: dispositivo GPS o administrativa.

- Ambos roles: consultar y desplegar antecedentes.
- Dueño: crear en un campo seleccionado y eliminar con confirmación.
- Formulario de alta: nombre, capacidad positiva, estado operativo y coordenadas administrativas opcionales.
- Estados operativos: Operativo, En mantenimiento, Fuera de servicio.
- No hay edición de bebedero expuesta en esta pantalla actual.
- La baja no puede realizarse si hay tareas abiertas asociadas; conserva lecturas y antecedentes.

El nivel, la vigencia de la lectura y el estado operativo son dimensiones distintas. Un bebedero puede tener una lectura alta pero antigua, o estar en mantenimiento.
