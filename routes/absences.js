const express = require('express');
const Absence = require('../models/absence');
const cron = require('node-cron');
let router = express.Router()


router.put('', (req, res) => {
    const {name, duree,type, femme  } = req.body;
    
    if (!name || !duree || !type || !femme) {
      return res.status(400).json({ message: 'Donnée manquer' });
    }
    
    Absence.create({
      nom_absence: name,
      duree: duree,
      type:type,
      seulement_femmes: femme,
    })
    .then(absence => res.json({ message: 'Absence bien créé', data: absence }))
    .catch(err => res.status(500).json({ message: 'db error', error: err }));
  });

  
// Route GET pour récupérer la liste des absences
router.get('/recup/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const absence = await Absence.findByPk(id);
    if (absence) {
      res.json(absence);
    } else {
      res.status(404).json({ error: 'Absence non trouvée' });
    }
  } catch (err) {
    console.error(err); // Affiche les détails de l'erreur
    res.status(500).json({ error: err.message });
  }
});

router.get('/dataliste', async (req, res) => {
  try {
    const absences = await Absence.findAll({
      attributes: ['id_absence', 'nom_absence', 'type'], // Sélectionner uniquement les champs nécessaires
    });
    res.json(absences);
  } catch (error) {
    console.error('Erreur lors de la récupération des absences:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});



  module.exports = router;
