const express = require('express');
const Absence = require('../models/absence');
const cron = require('node-cron');
let router = express.Router()
const  checkRole = require('../jsontokenweb/chekrole'); 
const checktokenmiddlware = require('../jsontokenweb/check');

function determinerPour(duree) {
  // Convertir 'duree' en nombre pour éviter les problèmes de type
  const dureeNombre = Number(duree);
  return dureeNombre === 0;
}

router.post('/ajout',checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']),  async (req, res) => {
  const { name, duree, type } = req.body;

  // Validation des données reçues
  if (!name || duree === undefined || !type) {
    return res.status(400).json({ message: 'Donnée manquante' });
  }

  // Déterminer la valeur de 'pour' en fonction de 'duree'
  const pour = determinerPour(duree);
  
  try {
    // Vérification des doublons
    const existingAbsence = await Absence.findOne({
      where: { nom_absence: name, type: type } // Adaptez cette condition selon vos besoins
    });

    if (existingAbsence) {
      return res.status(409).json({ message: 'Absence déjà existante' }); // 409 Conflict
    }

    // Création de la nouvelle absence dans la base de données
    const absence = await Absence.create({
      nom_absence: name,
      duree: duree,
      type: type,
      pour: pour // Ajouter 'pour' avec la valeur déterminée
    });

    // Réponse en cas de succès
    res.json({ message: 'Absence bien créée', data: absence });
  } catch (err) {
    // Réponse en cas d'erreur
    res.status(500).json({ message: 'Erreur de base de données', error: err });
  }
});

// Route GET pour récupérer la liste des absences
router.get('/recup/:id',checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']),  async (req, res) => {
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

router.get('/dataliste',checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']),  async (req, res) => {
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


router.get("/lisitraabsence" ,checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']),  async (req, res) => {
  try {
      const absence = await Absence.findAll({
          order: [["createdAt", "DESC"]],
      });
      res.json({ message: "Liste des absences", data: absence });
  } catch (err) {
      res
          .status(500)
          .json({ message: "Erreur de la base de données", error: err });
  }
});

// Route pour modifier une absence
router.patch('/modifierabsence/:id',checktokenmiddlware, checkRole(['ADMINISTRATEUR']),  async (req, res) => {
  const { id } = req.params; // Récupération de l'ID de l'absence à modifier
  const { name, duree, type } = req.body; // Récupération des données de la requête

  // Validation des données reçues
  if (!name && duree === undefined && !type) {
    return res.status(400).json({ message: 'Aucune donnée fournie pour la modification' });
  }

  try {
    // Recherche de l'absence par ID
    const absence = await Absence.findOne({ where: { id_absence: id } });

    // Vérification si l'absence existe
    if (!absence) {
      return res.status(404).json({ message: 'Absence non trouvée' });
    }

    // Mise à jour des champs seulement s'ils sont fournis
    absence.nom_absence = name || absence.nom_absence; // Utilisation de la valeur existante si non fournie
    absence.duree = duree !== undefined ? duree : absence.duree; // Mise à jour si fourni
    absence.type = type || absence.type; // Mise à jour si fourni

    // Déterminer la valeur de 'pour' en fonction de 'duree'
    absence.pour = determinerPour(absence.duree); // Mise à jour de 'pour' après modification

    // Sauvegarde des modifications
    await absence.save();

    // Réponse en cas de succès
    res.json({ message: 'Absence mise à jour avec succès', data: absence });
  } catch (err) {
    // Réponse en cas d'erreur
    res.status(500).json({ message: 'Erreur de base de données', error: err });
  }
});


// Route pour supprimer une absence
router.delete('/supprimer/:id',checktokenmiddlware, checkRole(['ADMINISTRATEUR']),  async (req, res) => {
  try {
    const absence = await Absence.findByPk(req.params.id);
    if (!absence) {
      return res.status(404).json({ error: 'Absence non trouvée.' });
    }

    await absence.destroy();
    res.status(200).json({ message: 'Absence supprimée avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'absence.' });
  }
});
// Route pour filtrer les utilisateurs par nom
router.get('/utilisateurs',checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']), async (req, res) => {
  const { nom } = req.query; 

  try {
      const utilisateurs = await Utilisateur.findAll({
          where: {
              nom: {
                  [Op.like]: `%${nom}%`, 
              },
          },
          order: [['createdAt', 'DESC']],
      });

      if (utilisateurs.length === 0) {
          return res.status(204).send(); 
      }

      res.json({ message: 'Liste des utilisateurs', data: utilisateurs });
  } catch (err) {
      res.status(500).json({ message: 'Erreur de la base de données', error: err });
  }
});


  module.exports = router;
