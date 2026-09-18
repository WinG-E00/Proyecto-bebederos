//importacion de modelo
import User from '../../models/User.model.js';


//Falta terminar
export const loginUser = async (req, res) => {

  try {

    const { user, gmail, password, perfilId } = req.body;


    //Buscar el usuario por correo
    const existingUser = await User.findOne({ gmail });

    if (!existingUser) {
      return res.status(404).json({ message: 'Usuario no encontrado...' })
    }

    

    const isPasswordValid = await bcrypt.compare(password, existingUser.password);

    if(!isPasswordValid){
        return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    
    return res.status(200).json({ message: "Se logeo correctamente", existingUser })




  }
  catch (error) {
    
  }
  
  
};