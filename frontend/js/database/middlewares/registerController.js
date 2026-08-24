
// EN teoria lo que tengo que hacer es hacer una validacion de los datos
// Para despues subirlo a  mi base de datos
export const  registerController = async (req, res) => {
  try {
    // 1. Extraemos los campos que vienen en el JSON (req.body)
    const { nombreCompleto, email, password, rol } = req.body;

    // 2. Creamos el registro en la base de datos con Sequelize
    const nuevoUsuario = await User.create({
      nombreCompleto,
      email,
      password,
      rol
    });

    // 3. Enviamos la respuesta de éxito al cliente
    return res.status(201).json({
      mensaje: "Usuario creado correctamente",
      usuario: nuevoUsuario
    });

  } catch (error) {
    console.error("Error en registerController:", error);

    // Manejo de error por restricción de campo único (ej: email repetido)
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: "El correo electrónico ya se encuentra registrado."
      });
    }

    // Respuesta genérica para otros errores de servidor o DB
    return res.status(500).json({
      error: "Ocurrió un error al intentar registrar el usuario."
    });
  }
};