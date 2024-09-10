const {DataTypes} = require('sequelize');
const DB = require('../db');
const sequelize = require('../db');

/***Definition des models */
const Absence = DB.define('Absence',{
    id_absence: {
      type: DataTypes.INTEGER(10),
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
      },
    nom_absence:{
        type:DataTypes.STRING,
        allowNull:false,
    },
    duree: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue:0.0
  },
    type: {
      type: DataTypes.STRING,
      defaultValue: false,
    },
    pour: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    }
  }
  );
  sequelize.sync()

  module.exports = Absence;