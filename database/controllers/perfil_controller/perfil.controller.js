import Perfil from '../../models/Perfil.model.js';




export const agregarPerfilController = async (req, res) => {
    try {

        const { perfil } = req.body;


        // añadir el registro a la base de datos


        const nuevoRegistroPerfil = await Perfil.create({
            perfil
        });

        return res.status(201).json({
            mensaje: 'Perfil creado con éxito',
            perfil: nuevoRegistroPerfil
        });




    }catch(err){
        return res.status(500).json({
            mensaje:'Error al crear el registro',
            error: err.message
        });
    }
};


