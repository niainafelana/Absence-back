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
        type: DataTypes.STRING,
        allowNull: false,  // 'demi-matin', 'demi-apres-midi' ou 'journee'
      },
      durefin: {
        type: DataTypes.STRING,
        allowNull: false,  // 'demi-matin', 'demi-apres-midi' ou 'journee'
      },
      jours_absence: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      motif: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      
});
Demande.belongsTo(Employe, { foreignKey: 'id_employe', as: 'employe' });
Demande.belongsTo(Absence, { foreignKey: 'id_absence', as: 'absence' });
Employe.hasMany(Demande, { foreignKey: 'id_employe', as: 'demandes' });
Absence.hasMany(Demande, { foreignKey: 'id_absence', as: 'demandes' });
sequelize.sync()

module.exports= Demande;