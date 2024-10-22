const {DataTypes} = require('sequelize');
const DB = require('../db');
const sequelize = require('../db');

/***Definition des models */
const Departement = DB.define('Departement',{
    id: {
      type: DataTypes.INTEGER(11),
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
      },
    code_departement:{
        type:DataTypes.STRING,
        allowNull:true,
        unique: true
    },
    description: {
      type:DataTypes.STRING,
      allowNull: true,
  },
    fonction: {
      type: DataTypes.STRING,
      defaultValue: true,
    },
    nom_departement:{
      type:DataTypes.STRING,
      allowNull:true,
    }
  },
     {
     tableName: 'departement', 
    });
  sequelize.sync()
  module.exports = Departement;