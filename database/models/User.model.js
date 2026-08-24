import { DataTypes } from 'sequelize';

import sequelize from './db/database.js';





export const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    gmail: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true // Validación opcional para asegurar que sea un correo válido
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'usuarios', // Opcional: si quieres que la tabla se llame así en la BD
    timestamps: true       // Crea automáticamente createdAt y updatedAt
});