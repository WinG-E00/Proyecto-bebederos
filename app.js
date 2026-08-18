import express from "express";
import { routerAuth } from "./js/database/router/router.js"

import sequelize from "./js/database/config/database.js" 

//Importacion de los modelos
import { User, Sensor } from "./js/database/models/proyecto_bebedores_db.js"


const app = express();


//midleware basico para que mi app entienda formato json
app.use(express.json());

//Aca uso mi router que tiene las rutas de Auth que van a ser login y register
app.use(routerAuth);






// Funcion que va conectar mi base de datos de la siguiente forma
//
async function main() {
    try {
        // 1. Verificar la conexión con la base de datos
        await sequelize.authenticate();
        console.log("Conexión a la base de datos establecida correctamente.");

        // 2. Sincronizar modelos (Crea las tablas 'usuarios' y 'sensores' si no existen)
        // El uso de { alter: true } actualiza las tablas si hay cambios en los modelos [5, 7]
        await sequelize.sync({ alter: true }); 
        console.log("Modelos sincronizados con la base de datos.");

        // 3. Iniciar el servidor Express
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("No se pudo conectar a la base de datos:", error);
    }
}

main();



