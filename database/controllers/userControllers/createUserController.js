import User from '../../models/User.model.js';
import bcrypt from 'bcrypt';


// Controlador para crear usuario
// Se supone que aca podes crear el usuario, este controllador sera usado para el router que permite hacer register

export const createUserController = async (req, res) => {
    try {
        const { user, gmail, password, perfilId } = req.body;

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Faltan crear las validaciones

        // Creacion
        const nuevoUsuario = await User.create({
            user,
            gmail,
            password: hashedPassword,
            perfilId
        });

        return res.status(201).json({
            mensaje: 'Usuario creado con éxito',
            usuario: nuevoUsuario
        });

    } catch(err) {
        return res.status(500).json({
            mensaje: 'Error al crear el usuario',
            error: err.message
        });
    }
};
