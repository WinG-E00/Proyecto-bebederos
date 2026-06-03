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














// COnsulta para obtener ubicaciones
async function obtenerUbicaciones() {
    try {
        const resultado = await pool.query(`
            SELECT
                id,
                name,
                latitude,
                longitude
            FROM water_thoughts
            WHERE is_active = TRUE
        `);

        console.log(resultado.rows);
    } catch (error) {
        console.error(error);
    }
}

//Consulta para obtener la cantidad de bebederos
async function obtenerCantidadBebederos() {
    try {
        const resultado = await pool.query(`
            SELECT COUNT(*) AS total
            FROM water_troughs
            WHERE is_active = TRUE
        `);

        console.log(resultado.rows[0]);
    } catch (error) {
        console.error(error);
    }
}

//consulta para obetener el nivel de agua de cada bebedero
async function obtenerNivelesAgua() {
    try {
        const resultado = await pool.query(`
            SELECT
                id,
                name,
                water_level,
                capacity_liters
            FROM water_thoughts
            WHERE is_active = TRUE
        `);

        console.log(resultado.rows);
    } catch (error) {
        console.error(error);
    }
}

//consulta para obtener la informacion completa de el bebedero
async function obtenerBebederos() {
    try {
        const resultado = await pool.query(`
            SELECT
                id,
                name,
                zone_or_paddock,
                latitude,
                longitude,
                water_level,
                capacity_liters
            FROM water_thoughts
            WHERE is_active = TRUE
        `);

        console.log(resultado.rows);
    } catch (error) {
        console.error(error);
    }
}





//Datos que van a requerir las consultas
//Nivel de agua de cada registro de los bebederos
//Cantidad de bebederos
//Ubicacion de los bebederos apartir de latitud y longitud












obtenerUsuarios();