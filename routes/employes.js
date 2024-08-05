const express = require('express');
const Employe = require('../models/employe');
const cron = require('node-cron');
let router = express.Router()

//Ajout employer dans le bd
router.put('', (req, res) => {
    const {nom, prenom, sexe, motif } = req.body;
    
    if (!nom || !prenom || !sexe || !motif) {
      return res.status(400).json({ message: 'Donnée manquer' });
    }
    
    Employe.create({
      nom_employe: nom,
      pre_employe: prenom,
      sexe: sexe,
      motif_employe: motif,
    })
    .then(employe => res.json({ message: 'Employé bien créé', data: employe }))
    .catch(err => res.status(500).json({ message: 'db error', error: err }));
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
  const { nom, prenom, sexe, motif } = req.body;

  try {
    const employe = await Employe.findOne({ where: { id_employe: id} });

    if (!employe) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }
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




module.exports = router;
