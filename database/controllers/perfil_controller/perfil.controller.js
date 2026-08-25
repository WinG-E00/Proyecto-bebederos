import Perfil from '../../models/Perfil.mode.js';




export const agregarPerfilController = async (req, res) => {
    try {

        const { perfil } = req.body;


        // añadir el registro a la base de datos


        const nuevoRegistroPerfil = Perfil.create({
            perfil
        });


        return res.status(201).json({
            mensaje: 'perfilC reado con existo',
            perfil: nuevoRegistroPerfil
        })




    }catch(err){
        return res.status(500).json({
            mensaje:'Error al crear el registro',
            error: err
        });
    }
};