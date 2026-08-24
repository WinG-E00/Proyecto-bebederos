import sequelize from '../../db/database.js';
import User from '../User.model.js';
import Perfil from '../Perfil.mode.js';
import Bebederos from "../Bebederos.model.js";


// Un Perfil tiene muchos Users; un User pertenece a un Perfil (1:N)
Perfil.hasMany(User, { foreignKey: 'perfilId', as: 'usuarios' });
User.belongsTo(Perfil, { foreignKey: 'perfilId', as: 'perfil' });

export { sequelize, User, Perfil };


// Un User tiene muchos bebederos
User.hasMany(Bebederos,{
    foreignKey: 'userId',
    as: 'bebederos'
})

Bebederos.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
})


