import express from "express";
import { registerController } from "../middlewares/registerController.js";
//Probablemente aca necesito los controladores?
//Probablemente sean controladores para manejar la base de datos y hacer un insert a de un registro

export const routerAuth = express.Router();

//Para la creacion de usuario

// Para el logeo de usuario
routerAuth.post("/api/auth/login", () => {
    console.log("Hola login")
});

//Para el registro de usuario
routerAuth.post("/api/auth/register", registerController)




