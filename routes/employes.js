const express = require('express');
const Employe = require('../models/employe');
const cron = require('node-cron');
let router = express.Router()

//Ajout employer dans le bd
router.put('', async (req, res) => {
  const { nom, prenom, sexe, motif, plafonnement, plafonnementbolean } = req.body;

  if (!nom || !prenom || !sexe || !motif) {
    return res.status(400).json({ message: 'Donnée manquante' });
  }

  try {
    const employe = await Employe.create({
      nom_employe: nom,
      pre_employe: prenom,
      sexe: sexe,
      motif_employe: motif,
      plafonnement: plafonnement || null,
      plafonnementbolean: plafonnementbolean || false,
    });

    res.json({ message: 'Employé bien créé', data: employe });
  } catch (err) {
    res.status(500).json({ message: 'Erreur de la base de données', error: err });
  }
});


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


//Recherche par id(lib_employé)
router.get('/:id', async (req, res) => {
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
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, sexe, motif, plafonnement, plafonnementbolean } = req.body;

  try {
    const employe = await Employe.findOne({ where: { id_employe: id } });

    if (!employe) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    employe.nom_employe = nom !== undefined ? nom : employe.nom_employe;
    employe.pre_employe = prenom !== undefined ? prenom : employe.pre_employe;
    employe.sexe = sexe !== undefined ? sexe : employe.sexe;
    employe.motif_employe = motif !== undefined ? motif : employe.motif_employe;
    employe.plafonnement = plafonnement !== undefined ? plafonnement : employe.plafonnement;
    employe.plafonnementbolean = plafonnementbolean !== undefined ? plafonnementbolean : employe.plafonnementbolean;

    await employe.save();

    res.json({ message: 'Employé mis à jour avec succès', data: employe });
  } catch (err) {
    res.status(500).json({ message: 'Erreur de la base de données', error: err });
  }
});
//effacer un employé a l'aide de leur id si necessaire
router.delete('/:id', async (req, res) => {
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
//agmentation du solde des employés
cron.schedule('*/1 * * * *', async () => { // Toutes les minutes pour le test
  try {
    const employes = await Employe.findAll();
    for (const employe of employes) {
      employe.solde_employe = parseFloat(employe.solde_employe) + 2.5;
      await employe.save();
    }
    console.log('Solde des employés augmente.');
  } catch (error) {
    console.error('Erreur :', error);
  }
});




module.exports = router;
