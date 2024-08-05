const {DataTypes} = require('sequelize');
const DB = require('../db');
const sequelize = require('../db');
const Absence = require('../models/absence');
const Employe = require('../models/employe');

//Definition des models
const Demande = DB.define('Demande',{
    id_demande: {
        type: DataTypes.INTEGER(10),
        autoIncrement: true,
        primaryKey: true
      },
      id_employe: {
        type: DataTypes.INTEGER(10),
        allowNull: false,
        references: {
          model: 'Employes',
          key: 'id_employe'
        }
      },
      id_absence: {
        type: DataTypes.INTEGER(10),
        allowNull: false,
        references: {
          model: 'Absences',
          key: 'id_absence'
        }
      },
      date_debut: {
        type: DataTypes.DATE,
        allowNull: false
      },
      date_fin: {
        type: DataTypes.DATE,
        allowNull: false
      },
      date_demande: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
      },
      jours_absence: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      duredebut: {
        type: DataTypes.ENUM('demi-matin', 'demi-apres-midi', 'journee'),
        allowNull: false,
      },
      durefin: {
        type: DataTypes.ENUM('demi-matin', 'demi-apres-midi', 'journee'),
        allowNull: false,
      }
      
});
sequelize.sync()

module.exports= Demande;