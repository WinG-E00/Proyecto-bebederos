import { DataTypes } from 'sequelize'
export function defineWeatherCache(db) {
 return db.define('WeatherCache',{
  farmId:{type:DataTypes.INTEGER.UNSIGNED,primaryKey:true},
  queriedLocation:{type:DataTypes.JSON,allowNull:false},
  data:{type:DataTypes.JSON,allowNull:false},
  fetchedAt:{type:DataTypes.DATE(3),allowNull:false},
 },{tableName:'WeatherCaches',timestamps:false})
}
