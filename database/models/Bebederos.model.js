import { DataTypes } from 'sequelize';
import sequelize from '../db/database.js'; // Ajusta la ruta a tu archivo de conexión de Sequelize

const Bebederos = sequelize.define('Bebederos', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  water_level: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  longitud: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  latitud: {
    type: DataTypes.FLOAT,
    allowNull: false
  }
}, {
  tableName: 'bebederos',
  timestamps: true
});

export default Bebederos;