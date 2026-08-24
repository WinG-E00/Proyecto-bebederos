//Importacion del modelo de bebederos para poder usar sus metodos
import Bebederos from '../../models/Bebederos.model.js'


//Controlador para crear un registro de un bebedero
export const createBebederosRegister = async (req, res) => {
    
    try {
        const { water_level, longitud, latitud, userId } = req.body;

        // faltan validadores

        const nuevoBebedero = await Bebederos.create({
            water_level,
            longitud,
            latitud,
            userId
        });

        return res.status(201).json({
            ok: true,
            message: "Bebedero registrado con éxito",
            data: nuevoBebedero
        });

    } catch(err){
        console.error("Error al crear bebedero:", err);
        return res.status(500).json({
            ok: false,
            message: "Error interno del servidor",
            error: err.message
        });
    }
}