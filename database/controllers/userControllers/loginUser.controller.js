//importacion de modelo
import User from '../../models/User.model.js';



export const loginUser = async (req, res) => {

  try {

    const { user, gmail, password, perfilId } = req.body;


    //Buscar el usuario por correo
    const existingUser = await User.findOne({ gmail });

    if (!existingUser) {
      return res.status(404).json({ message: 'Usuario no encontrado...' })
    }


    


  }
  catch (error) {
    
  }
  
  
};