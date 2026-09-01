import { DataTypes } from 'sequelize';
// Asegúrate de importar tu instancia de sequelize desde tu archivo de conexión
import sequelize from '../db/database.js'; // Ajusta la ruta según tu proyecto

const Perfil = sequelize.define('Perfil', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  perfil: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'perfiles',
  timestamps: true
});

export default Perfil;


