//Importacion de router
import { Router } from 'express';
//aqui van las importaciones de los controladores

//Controller para crear un bebedero
import { createBebederosRegister } from '../controllers/bebederos_controllers/createBebederos.js';

//Controller para informacion de bebederos
import { getBebederosInfo } from '../controllers/bebederos_controllers/getBebederosInfo.js';
import { getBebederosPerIdBebedero } from '../controllers/bebederos_controllers/getBebederosPerIdBebedero.controller.js'


export const router = Router();





// RUTAS //

//Ruta para crear registro de bebederos
router.post('/api/bebederos/create', createBebederosRegister );


//Ruta para obtener informacion de los bebederos asociados a un usuario
router.post('/api/bebederos/UserId/:id', getBebederosInfo);


//ruta para obtener la informacion de un bebedero en especifico
router.post('/api/bebederos/bebederoId/:id', getBebederosPerIdBebedero)











