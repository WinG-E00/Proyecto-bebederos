import express from "express.js";

//Probablemente aca necesito los controladores?
//Probablemente sean controladores para manejar la base de datos y hacer un insert a de un registro

const routerAuth = express.Router();

//Para la creacion de usuario
//Necesito un midleware que registre a mi usuario en la base de datos
routerAuth.post("/api/auth/register", () => {
    console.log("Hola register")
});

// Para el logeo de usuario
routerAuth.post("/api/auth/login", () => {
    console.log("Hola login")
});



