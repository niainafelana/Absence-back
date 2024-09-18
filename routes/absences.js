const express = require('express');
const Absence = require('../models/absence');
const cron = require('node-cron');
let router = express.Router()

function determinerPour(duree) {
  // Convertir 'duree' en nombre pour éviter les problèmes de type
  const dureeNombre = Number(duree);
  return dureeNombre === 0;
}

router.put('/ajout', async (req, res) => {
  const { name, duree, type } = req.body;

  // Validation des données reçues
  if (!name || duree === undefined || !type) {
      return res.status(400).json({ message: 'Donnée manquer' });
  }

  // Déterminer la valeur de 'pour' en fonction de 'duree'
  const pour = determinerPour(duree);
  try {
      // Création de la nouvelle absence dans la base de données
      const absence = await Absence.create({
          nom_absence: name,
          duree: duree,
          type: type,
          pour: pour // Ajouter 'pour' avec la valeur déterminée
      });
      // Réponse en cas de succès
      res.json({ message: 'Absence bien créé', data: absence });
  } catch (err) {
      // Réponse en cas d'erreur
      res.status(500).json({ message: 'Erreur de base de données', error: err });
  }
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
      attributes: ['id_absence', 'nom_absence', 'type','duree','pour'], // Sélectionner uniquement les champs nécessaires
    });
    res.json(absences);
  } catch (error) {
    console.error('Erreur lors de la récupération des absences:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});



  module.exports = router;
