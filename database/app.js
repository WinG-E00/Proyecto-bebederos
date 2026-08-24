import express from "express";
import 'dotenv/config';
import sequelize from "./db/database.js";

//import routers
import { router } from './router/user.router.js'


//import de modelos
import User from './models/User.model.js';
import Perfil from './models/Perfil.mode.js';
import Bebederos from './models/Bebederos.model.js';
import './models/relations/relations.js';
import { router as userRouter } from './router/user.router.js';
import { router as bebederosRouter} from './router/bebederos.router.js' ;

const app = express();
const PORT = process.env.PORT || 3000;


//midleware basico para que mi app entienda formato json
app.use(express.json());
// Montar routers
app.use(bebederosRouter);
app.use(userRouter);
app.use(router);
//Aca uso mi router que tiene las rutas de Auth que van a ser login y register
//Aca voy a tener que crear todos los routers necesarios para cada modelo que voy a tener.




app.get('/test', (req, res) => {
    res.send('Ok')
});



// Funcion que va conectar mi base de datos de la siguiente forma
async function main() {
    try {
            // 1. Verificar la conexión con la base de datos
        await sequelize.authenticate();
        console.log("Conexión a la base de datos establecida correctamente.");

            // 2. Sincronizar modelos (Crea las tablas 'usuarios' y 'sensores' si no existen)
            // El uso de { alter: true } actualiza las tablas si hay cambios en los modelos
        await sequelize.sync({ force: true }); // Ahora esta en forze por que esta en fase de desarrollo
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



