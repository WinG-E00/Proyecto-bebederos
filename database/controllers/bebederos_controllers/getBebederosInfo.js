import Bebederos from '../../models/Bebederos.model.js';

// Este controlador entrega todos los bebederos obtenidos de un id si los encuentra si no no entraga nada
export const getBebederosInfo = async (req, res) => {

  try {

    const bebederosInfo = await Bebederos.findByPk(req.params.id)

    //Validador implementar luego con express validator
    if (!bebederosInfo) {
      return res.status(404).json({ message:  "Bebederos no encontrados"})
    }
    //Respuesta con todos los bebederos
    return res.json(bebederosInfo)

  }
  catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
