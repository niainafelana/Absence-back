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

/*
//Récupération tous les employés triés par date de création la plus récente
router.get("", async (req, res) => {
    try {
        const employes = await Employe.findAll({
            order: [["createdAt", "DESC"]],
        });
        res.json({ message: "Liste des employés", data: employes });
    } catch (err) {
        res
            .status(500)
            .json({ message: "Erreur de la base de données", error: err });
    }
});


//Recherche par mdp(lib_employé)
router.get('/:mdp', async (req, res) => {
    const { mdp } = req.params;

    try {
        const employe = await Employe.findOne({ where: { lib_employe: mdp } });

        if (!employe) {
            return res.status(404).json({ message: 'Employé non trouvé' });
        }

        res.json({ message: 'Employé trouvé', data: employe });
    } catch (err) {
        res.status(500).json({ message: 'Erreur de la base de données', error: err });
    }
});


// Mise à jour des données d'un employé par mdp
router.patch('/:mdp', async (req, res) => {
    const { mdp } = req.params;
    const { mdpp, nom, prenom, sexe, motif } = req.body;
  
    try {
      const employe = await Employe.findOne({ where: { lib_employe: mdp } });
  
      if (!employe) {
        return res.status(404).json({ message: 'Employé non trouvé' });
      }
  
      employe.lib_employe = mdpp || employe.lib_employe;
      employe.nom_employe = nom || employe.nom_employe;
      employe.pre_employe = prenom || employe.pre_employe;
      employe.sexe = sexe || employe.sexe;
      employe.motif_employe = motif || employe.motif_employe;
  
      await employe.save();
  
      res.json({ message: 'Employé mis à jour avec succès', data: employe });
  
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ message: 'Un employé avec ce mdp existe déjà', error: err });
      }
  
      res.status(500).json({ message: 'Erreur de la base de données', error: err });
    }
  });
  
*/