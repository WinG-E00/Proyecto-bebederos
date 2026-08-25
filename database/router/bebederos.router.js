//Importacion de router
import { Router } from 'express';
import { createBebederosRegister } from '../controllers/bebederos_controllers/createBebederos.js';
//aqui van las importaciones de los controladores


export const router = Router();


//Ruta para crear registro de bebederos
router.post('/api/bebederos/create', createBebederosRegister );











