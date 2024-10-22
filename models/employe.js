const { DataTypes } = require("sequelize");
const DB = require("../db");
const sequelize = require("../db");

/***Definition des models */
const Employe = DB.define(
  "Employe",
  {
    id_employe: {
      type: DataTypes.INTEGER(10),
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    nom_employe: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    pre_employe: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sexe: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    poste: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    matricule: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    departement: {
      type: DataTypes.STRING,
      allowNull:true,
    },
    solde_employe: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0.0,
    },
    plafonnement: {
      type: DataTypes.FLOAT,
      allowNull: true, // Peut être null si aucun plafonnement spécifique
    },
    plafonnementbolean: {
      type: DataTypes.BOOLEAN,
      allowNull: true, // Peut être null si le plafonnement n'est pas appliqué
    },
    last_solde_update: {
      type: DataTypes.DATE, // Enregistre la dernière date de mise à jour
      allowNull: true,
    },
  },
  {
    tableName: "personnel",
  }
);
sequelize.sync();

module.exports = Employe;
