import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";



//Tabla de usuarios
export const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // Evita que se repitan correos
    validate: {
      isEmail: true // Valida que tenga estructura de correo válida
    }
  },
  nombreCompleto: {
    type: DataTypes.STRING,
    allowNull: false,
    // Puedes mapearlo a snake_case en la BD si prefieres: field: 'nombre_completo'
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
    // Recuerda que en producción es buena práctica guardar el hash (ej. con bcrypt) y no texto plano
  },
  rol: {
    type: DataTypes.ENUM('owner', 'slave'),
    allowNull: false,
  }
}, {
  tableName: 'usuarios' // Fuerza a que la tabla en MySQL se llame exactamente así
});



export const Sensor = sequelize.define('Sensor', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8), // Coordenadas GPS de alta precisión
    allowNull: false
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false
  },
  water_level: {
    type: DataTypes.INTEGER, // Porcentaje (0 a 100)
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    }
  }
}, { 
  tableName: 'sensores',
  timestamps: true // Te guarda automáticamente la fecha y hora de cada medición
});


