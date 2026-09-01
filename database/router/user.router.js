import { Router } from 'express';
import { createUserController } from '../controllers/userControllers/createUserController.js';

import { loginUser } from '../controllers/userControllers/loginUser.controller.js';


export const router =  Router();


//Ruta para crear usuario
router.post('/api/user/create', createUserController);

// Ruta para hacer login
router.post('api/user/login', loginUser);




