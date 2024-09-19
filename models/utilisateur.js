const { DataTypes } = require("sequelize");
const DB = require("../db");
const sequelize = require("../db");
const Utilisateur = DB.define("Utilisateur", {
  id_user: {
    type: DataTypes.INTEGER(10),
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  nom_user: {
    type: DataTypes.STRING(250),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(100),
    primaryKey: true,
    allowNull: false,
  },
 
  role:{
    type:DataTypes.STRING(250),
    allowNull:false
  },
  mpd_user:{
    type:DataTypes.STRING(250),
    allowNull:false
  }
});
sequelize.sync();

module.exports = Utilisateur;
