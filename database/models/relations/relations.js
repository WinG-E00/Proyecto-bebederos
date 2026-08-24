import { DataTypes } from 'sequelize';
import { sequelize } from '../../db/database.js';


import User from '../User.model.js';
import Perfil from '../Perfil.mode.js';




User.hasOne(Perfil,{
    foreignKey: 'perfilId',
    as:  'perfil'
} );


Perfil.belongsTo(User, { 
    foreignKey: 'perfilid',
    as: 'user'
})



