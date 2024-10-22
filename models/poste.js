const {DataTypes} = require('sequelize');
const DB = require('../db');
const sequelize = require('../db');

/***Definition des models */
const Poste = DB.define('Poste',{
    id: {
      type: DataTypes.INTEGER(11),
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
      },
    code_departement:{
        type:DataTypes.STRING,
        allowNull:true,
    },
    description: {
      type:DataTypes.STRING,
      allowNull: true,
  },
    fonction: {
      type: DataTypes.STRING,
      defaultValue: true,
    }},
     {
     tableName: 'poste', 
    });
  sequelize.sync()
  module.exports = Poste;