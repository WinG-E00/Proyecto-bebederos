# Establecimientos

Ruta: `/farms`.

Listado filtrado por el campo seleccionado, con tarjetas de nombre, descripción, hectáreas, cantidad de animales y bebederos, coordenadas, antigüedad máxima permitida para mediciones y zona horaria.

El dueño puede crear y editar mediante formulario: nombre, latitud, longitud, superficie en ha, antigüedad máxima en minutos, zona horaria y descripción opcional. La zona horaria inicial es `America/Argentina/Buenos_Aires`; la antigüedad inicial es 180 minutos. El formulario muestra el estado guardando y errores por campo, y permite cancelar.

Eliminar requiere confirmación. Solo se puede retirar un campo sin animales, bebederos activos ni tareas abiertas. Se retiran accesos e invitaciones de ese campo y se conservan antecedentes. El peón consulta; no ve estas acciones.
