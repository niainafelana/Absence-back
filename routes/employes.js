const express = require('express');
const Employe = require('../models/employe');
const { Op } = require("sequelize");
const cron = require('node-cron');
let router = express.Router()

const  checkRole = require('../jsontokenweb/chekrole'); 
const checktokenmiddlware = require('../jsontokenweb/check');
const sequelize = require('../db');

//Ajout employer dans le bd
router.put('',checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']), async (req, res) => {
  const { nom, prenom, sexe, motif, plafonnement, plafonnementbolean,matricule,departement } = req.body;

  if (!nom || !prenom || !sexe || !motif) {
    return res.status(400).json({ message: 'Donnée manquante' });
  }

  try {
    const employe = await Employe.create({
      nom_employe: nom,
      pre_employe: prenom,
      sexe: sexe,
      poste: motif,
      matricule:matricule,
      departement:departement,
      plafonnement: plafonnement || null,
      plafonnementbolean: plafonnementbolean || false,
    });

    res.json({ message: 'Employé bien créé', data: employe });
  } catch (err) {
    res.status(500).json({ message: 'Erreur de la base de données', error: err });
  }
});
 

  //Récupération tous les employés triés par date de création la plus récente
router.get("/listetable", checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']),async (req, res) => {
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

//Recherche par id(lib_employé)
router.get('/search/:id', checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']),async (req, res) => {
  const { id } = req.params;

  try {
      const employe = await Employe.findOne({ where: { id_employe: id } });

      if (!employe) {
          return res.status(404).json({ message: 'Employé non trouvé' });
      }

      res.json({ message: 'Employé trouvé', data: employe });
  } catch (err) {
      res.status(500).json({ message: 'Erreur de la base de données', error: err });
  }
});


// Modification des employés par id
router.patch('/modife/:id', checktokenmiddlware, checkRole(['ADMINISTRATEUR']),async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, sexe, motif, plafonnement, plafonnementbolean,matricule,departement,solde_employe} = req.body;

  try {
    const employe = await Employe.findOne({ where: { id_employe: id } });

    if (!employe) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    employe.nom_employe = nom !== undefined ? nom : employe.nom_employe;
    employe.pre_employe = prenom !== undefined ? prenom : employe.pre_employe;
    employe.sexe = sexe !== undefined ? sexe : employe.sexe;
    employe.poste = motif !== undefined ? motif : employe.poste;
    employe.matricule = matricule !==undefined ? matricule:employe.matricule;
    employe.departement= departement !==undefined ? departement:employe.departement;
    employe.plafonnement = plafonnement !== undefined ? plafonnement : employe.plafonnement;
    employe.plafonnementbolean = plafonnementbolean !== undefined ? plafonnementbolean : employe.plafonnementbolean;
    employe.solde_employe = solde_employe !== undefined ? solde_employe : employe.solde_employe;

    await employe.save();

    res.json({ message: 'Employé mis à jour avec succès', data: employe });
  } catch (err) {
    res.status(500).json({ message: 'Erreur de la base de données', error: err });
  }
});
//effacer un employé a l'aide de leur id si necessaire
router.delete('/delete/:id',checktokenmiddlware, checkRole(['ADMINISTRATEUR']), async (req, res) => {
  try {
    const employe = await Employe.findByPk(req.params.id);
    if (!employe) {
      return res.status(404).json({ error: 'Employé non trouvé.' });
    }

    await employe.destroy();
    res.status(200).json({ message: 'Employé supprimé avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'employé.' });
  }
});


/**pour faire dataliste sur le champ employe*/
router.get('/dataliste',checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']), async (req, res) => {
  try {
    const employes = await Employe.findAll({
      attributes: ['id_employe', 'nom_employe', 'pre_employe'], // Sélectionner uniquement les champs nécessaires
    });
    res.json(employes);
  } catch (error) {
    console.error('Erreur lors de la récupération des employés:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour filtrer les utilisateurs par nom
// Route pour filtrer les employés par matricule
router.get('/mitady', async (req, res) => {
  const { search } = req.query; 

  try {
      const employes = await Employe.findAll({
          where: {
              [Op.or]: [
                  { matricule: { [Op.like]: `%${search}%` } },
                  { nom_employe: { [Op.like]: `%${search}%` } },
                  { pre_employe: { [Op.like]: `%${search}%` } },
              ],
          },
          order: [['createdAt', 'DESC']],
      });

      if (employes.length === 0) {
          return res.status(204).send(); // Aucune donnée trouvée
      }

      res.json({ message: 'Liste des employés', data: employes });
  } catch (err) {
      res.status(500).json({ message: 'Erreur de la base de données', error: err });
  }
});



module.exports = router;
