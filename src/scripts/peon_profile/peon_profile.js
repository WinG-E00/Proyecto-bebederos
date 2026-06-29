import pool from './Proyecto-bebederos/src/scripts/peon_profile/peon_profile.js';

//Prueba para comprar la conexion con la base de datos
async function obtenerUsuarios() {
    try {
        const resultado = await pool.query(
            'SHOW DATABASES'
        );

        console.log(resultado);
    } catch (error) {
        console.error(error);
    }
}




//Datos que van a requerir las consultas
//Nivel de agua de cada registro de los bebederos
//Cantidad de bebederos
//Ubicacion de los bebederos apartir de latitud y longitud












obtenerUsuarios();