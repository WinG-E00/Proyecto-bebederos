import { Router } from 'express';
import { agregarPerfilController } from '../controllers/perfil_controller/perfil.controller.js';



const router = Router();


//
router.post('api/perfil/create', agregarPerfilController );
