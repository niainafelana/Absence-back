const { DataTypes } = require("sequelize");
const DB = require("../db");
const sequelize = require("../db");
const Utilisateur = DB.define("Utilisateur", {
  id: {
    type: DataTypes.INTEGER(11),
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  nom: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique:true,
  },
 
  role:{
    type:DataTypes.STRING,
    allowNull:false
  },
  password:{
    type:DataTypes.STRING,
    allowNull:false
  }
} ,{
  tableName: 'user', 
 });
sequelize.sync();

module.exports = Utilisateur;
