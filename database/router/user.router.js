import { Router } from 'express';
import { createUserController } from '../controllers/userControllers/createUserController.js';

export const router =  Router();



//Ruta para crear usuario
router.post('/api/user/create', createUserController);

