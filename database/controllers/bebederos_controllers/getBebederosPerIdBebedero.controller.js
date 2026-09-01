import Bebederos from '../../models/Bebederos.model.js';


export const getBebederosPerIdBebedero = async (req, res) => {
  try {

    const bebederoUnico = await Bebederos.findByPk(req.params.id);

    //Validador implementar luego con express validator
    if (!bebederoUnico) {
      return res.status(404).json({ message:  "Bebederos no encontrados"})
    }

    return res.json(bebederoUnico)

  } catch(error) {
    return res.status(500).json({ message: error.message });
  }
};