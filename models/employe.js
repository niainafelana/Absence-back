const { DataTypes } = require('sequelize');
const DB = require('../db'); 
const sequelize = require('../db');

/***Definition des models */
const Employe = DB.define('Employe', {
    id_employe: {
        type: DataTypes.INTEGER(10),
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    nom_employe: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    pre_employe: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    sexe: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    motif_employe: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    solde_employe: {
        type: DataTypes.DECIMAL(10, 1),
        allowNull: true,
        defaultValue:0.0
    }
});
sequelize.sync()

module.exports = Employe;

