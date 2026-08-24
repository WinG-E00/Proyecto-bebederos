import { DataTypes } from 'sequelize';
import sequelize from '../db/database.js';

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    gmail: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    perfilId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'perfiles', key: 'id' },
    },
}, {
    tableName: 'usuarios',
    timestamps: true,
});

export default User;