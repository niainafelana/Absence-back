const express = require("express");
const Employe = require("../models/employe");
const Demande = require("../models/demande");
const Absence = require("../models/absence");
const { Op ,literal} = require("sequelize");
const multer = require('multer');
const path = require('path');
const router = express.Router();
const moment = require("moment");
const  checkRole = require('../jsontokenweb/chekrole'); // Si dans le même fichier
const checktokenmiddlware = require('../jsontokenweb/check');
//fonction pour calculer dateretour
function calculerDateRetour(dateFin, durefin, duredebut, dateDebutJS) {
  let dateRetour = moment(dateFin);
  let dateDebutMoment = moment(dateDebutJS); // Assurez-vous que datedebutJS est bien une date valide
  // si dateDebut et dateFin sont le même jour
  if (dateDebutMoment.isSame(dateFin, "day")) {
    if (duredebut === "matin" && durefin === "matin") {
      dateRetour;
    } else if (duredebut === "apresmidi" && durefin === "apresmidi") {
      dateRetour.add(1, "days");
    } else if (duredebut === "matin" && durefin === "apresmidi") {
      dateRetour.add(1, "days");
    }
  } else {
    // si dateDebut et dateFin sont sur des jours différents
    if (durefin === "matin") {
      dateRetour;
    } else if (durefin === "apresmidi") {
      dateRetour.add(1, "days");
    }
  }

  //si dateRetour tombe un week-end
  if (dateRetour.isoWeekday() === 6) {
    // Samedi
    dateRetour.add(2, "days").set({ hour: 9, minute: 0 });
  } else if (dateRetour.isoWeekday() === 7) {
    // Dimanche
    dateRetour.add(1, "days").set({ hour: 9, minute: 0 });
  }

  return dateRetour.toDate();
}

//fonction pour trouver durefin(matin ou apresmidi)
function determinerDurefin(jours_absence, duredebut) {
  let durefin;

  // verification si nbre absence est ent
  const estFraction = jours_absence % 1 !== 0;

  if (jours_absence === 0.5) {
    // Pour une absence d'une demi-journée, la fin est la même que le début
    durefin = duredebut;
  } else if (jours_absence === 1) {
    // Pour une absence d'une journée complète
    if (duredebut === "matin") {
      durefin = "apresmidi";
    } else if (duredebut === "apresmidi") {
      durefin = "matin";
    }
  } else if (jours_absence > 1) {
    if (estFraction) {
      // Si l'absence est fractionnée, durefin est identique à duredebut
      durefin = duredebut;
    } else {
      // Si l'absence est entière, durefin est l'opposée de duredebut
      if (duredebut === "matin") {
        durefin = "apresmidi";
      } else if (duredebut === "apresmidi") {
        durefin = "matin";
      }
    }
  }

  return durefin;
}

async function doublons(id_employe, id_absence, dateDebut, dateFin) {
  const existe = await Demande.findOne({
    where: {
      id_employe,
      id_absence,
      date_debut: dateDebut,
      date_fin: dateFin,
    },
  });
  return existe;
}

// Fonction pour calculer les jours d'absence en tenant compte des demi-journées
function calculerJoursAbsence(dateDebut, dateFin, duredebut, durefin) {
  const start = moment(dateDebut);
  const end = moment(dateFin);

  let totalDays = end.diff(start, "days") + 1;
  if (duredebut === "matin" && durefin === "apresmidi") {
    totalDays -= 0.5;
  } else if (duredebut === "matin" || durefin === "apresmidi") {
    totalDays -= 0.5;
  }

  return totalDays;
}

// Création demande d'absence
router.put("/ajout",checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']), async (req, res) => {
  const { id_employe, id_absence, datedeb, jours_absence, duredebut, motif } =
    req.body;

  try {
    const dateDebut = moment(datedeb, "YYYY-MM-DD", true);
    if (!dateDebut.isValid()) {
      return res
        .status(400)
        .json({ error: "La date de début fournie est invalide." });
    }

    let dateDebutJS = dateDebut.toDate();

    // Vérifiez l'existence de l'absence et de l'employé
    let absence = await Absence.findByPk(id_absence);
    if (!absence) {
      return res.status(404).json({ error: "Absence non trouvée" });
    }

    let employe = await Employe.findByPk(id_employe);
    if (!employe) {
      return res.status(404).json({ error: "Employé non trouvé" });
    }

    // Vérifier que le type d'absence est compatible avec le sexe
    if (absence.nom_absence === "maternite" && employe.sexe !== "F") {
      return res
        .status(400)
        .json({ error: "Un homme ne peut pas avoir un congé de maternité" });
    }

    if (absence.nom_absence === "paternite" && employe.sexe !== "M") {
      return res
        .status(400)
        .json({ error: "Une femme ne peut pas avoir un congé de paternité" });
    }
    if (absence.pour == 0) {
      let motifSpecial = motif;
      let joursAbsenceSpecial = absence.duree; //duree avy any @ bd
      let joursAbsenceSaisis = parseFloat(jours_absence); //avy @ body
      let solde_employe = employe.solde_employe;

      // Vérifiez les valeurs calculées
      console.log("joursAbsenceSaisis:", joursAbsenceSaisis);
      console.log("joursAbsenceSpecial:", joursAbsenceSpecial);

      if (joursAbsenceSaisis <= joursAbsenceSpecial) {
        const dateFin = moment(dateDebutJS)
          .add(joursAbsenceSaisis - 1, "days")
          .toDate();
        const durefin = determinerDurefin(joursAbsenceSaisis, duredebut);
        const dateRetour = calculerDateRetour(
          dateFin,
          durefin,
          duredebut,
          dateDebutJS
        );
        const surplus = 0;

        const exist = await doublons(
          id_employe,
          id_absence,
          dateDebutJS,
          dateFin
        );
        if (exist) {
          return res
            .status(400)
            .json({ error: "Une demande similaire existe déjà." });
        }

        // Créer la demande
        const nouvelleDemande = await Demande.create({
          id_employe,
          id_absence,
          date_debut: dateDebutJS,
          date_fin: dateFin,
          date_retour: dateRetour,
          date_demande: new Date(),
          jours_absence: joursAbsenceSaisis,
          duredebut,
          durefin,
          motif: motifSpecial,
          surplus,
          solde_employe:solde_employe,
        });

        return res.status(201).json({
          demandeSpeciale: nouvelleDemande,
          message: "Demande spéciale créée avec succès.",
        });
      }

      //miotra ny any @ bd
      else {
        // Cas où joursAbsenceSaisis > joursAbsenceSpecial (calcul de la différence)
        const difference = joursAbsenceSaisis - joursAbsenceSpecial;
        //différence

        // Calcul des dates du mois
        let debutMois = new Date(
          dateDebutJS.getFullYear(),
          dateDebutJS.getMonth(),
          1
        );
        let finMois = new Date(
          dateDebutJS.getFullYear(),
          dateDebutJS.getMonth() + 1,
          0
        );

        // Obtenir les demandes pour le mois en cours
        const demandesMois = await Demande.findAll({
          where: {
            id_employe,
            date_debut: {
              [Op.lte]: finMois,
            },
            date_fin: {
              [Op.gte]: debutMois,
            },
          },
          include: [
            {
              model: Absence,
              as: "absence",
              where: {
                pour: 1,
              },
            },
          ],
        });
        const totalJoursMois = demandesMois.reduce((total, d) => {
          return (
            total +
            calculerJoursAbsence(
              d.date_debut,
              d.date_fin,
              d.duredebut,
              d.durefin
            )
          );
        }, 0);

        const demandeSurplus = await Demande.findAll({
          where: {
            id_employe,
            date_debut: {
              [Op.lte]: finMois,
            },
            date_fin: {
              [Op.gte]: debutMois,
            },
          },
          include: [
            {
              model: Absence,
              as: "absence",
              where: {
                pour: false,
              },
            },
          ],
        });

        const totalSurplus = demandeSurplus.reduce((total, demande) => {
          return total + demande.surplus;
        }, 0);
        const moisjour = totalJoursMois + totalSurplus;
        const totalAvecNouvelleDemande = moisjour + difference;
        const restant = employe.plafonnement - moisjour;

        if (
          employe.plafonnementbolean &&
          totalAvecNouvelleDemande > employe.plafonnement
        ) {
          return res.status(400).json({
            "code": "ERR_CONGE_LIMIT",
            error: `Votre demande ne peut pas depasser de ${employe.plafonnement} jours pour ce mois-ci. Vous avez déjà pris ${moisjour} jours ce mois-ci.Le nombre de jours restants que vous pouvez encore prendre ce mois-ci est de ${restant}`,
          });
        }
        if (employe.solde_employe < difference) {
          return res.status(400).json({
            error: `Solde insuffisant pour prendre ce congé. Votre solde est ${employe.solde_employe} jours.`,
          });
        }

        const nouveauSolde = employe.solde_employe - difference;

  employe.solde_employe = nouveauSolde;

        
        await employe.save();
        const dateFin = moment(dateDebutJS)
          .add(joursAbsenceSaisis - 1, "days")
          .toDate();
        const durefin = determinerDurefin(joursAbsenceSaisis, duredebut);

        const dateRetour = calculerDateRetour(
          dateFin,
          durefin,
          duredebut,
          dateDebutJS
        );
        const exist = await doublons(
          id_employe,
          id_absence,
          dateDebutJS,
          dateFin
        );
        if (exist)
          return res
            .status(400)
            .json({ error: "Une demande similaire existe déjà." });

        const nouvelleDemande = await Demande.create({
          id_employe,
          id_absence,
          date_debut: dateDebutJS,
          date_fin: dateFin,
          date_retour: dateRetour,
          date_demande: new Date(),
          jours_absence: joursAbsenceSaisis,
          duredebut,
          durefin,
          motif: motifSpecial,
          surplus: difference,
          solde_employe:nouveauSolde,
        });

        return res.status(201).json({
          demandeSpeciale: nouvelleDemande,
          message: "Demande spéciale créée avec succès.",
        });
      }
    } else {
      const joursAbsence = parseFloat(jours_absence);
      const motifSpecial = motif;
      const surplus = 0;
      let dateFin;
      if (joursAbsence > 0.5) {
        dateFin = moment(dateDebutJS)
          .add(joursAbsence - 1, "days")
          .toDate();
      } else {
        dateFin = dateDebutJS; // Pour une demi-journée, la date de fin est la même que la date de début
      }
      const durefin = determinerDurefin(joursAbsence, duredebut);

      // Calcul des dates du mois
      let debutMois = new Date(
        dateDebutJS.getFullYear(),
        dateDebutJS.getMonth(),
        1
      );
      let finMois = new Date(
        dateDebutJS.getFullYear(),
        dateDebutJS.getMonth() + 1,
        0
      );

      // Obtenir les demandes pour le mois en cours
      const demandesMois = await Demande.findAll({
        where: {
          id_employe,
          date_debut: {
            [Op.lte]: finMois,
          },
          date_fin: {
            [Op.gte]: debutMois,
          },
        },
        include: [
          {
            model: Absence,
            as: "absence",
            where: {
              pour: true,
            },
          },
        ],
      });

      const totalJoursMois = demandesMois.reduce((total, d) => {
        return (
          total +
          calculerJoursAbsence(d.date_debut, d.date_fin, d.duredebut, d.durefin)
        );
      }, 0);

      const demandeSurplus = await Demande.findAll({
        where: {
          id_employe,
          date_debut: {
            [Op.lte]: finMois,
          },
          date_fin: {
            [Op.gte]: debutMois,
          },
        },
        include: [
          {
            model: Absence,
            as: "absence",
            where: {
              pour: false,
            },
          },
        ],
      });

      const totalSurplus = demandeSurplus.reduce((total, demande) => {
        return total + demande.surplus;
      }, 0);

      const moisjour = totalJoursMois + totalSurplus;
      const totalAvecNouvelleDemande = moisjour + joursAbsence;
      const restant = employe.plafonnement - moisjour;
      if (employe.plafonnementbolean) {
        if (totalAvecNouvelleDemande > employe.plafonnement) {
          return res.status(400).json({
            "code": "ERR_CONGE_LIMIT",
            error: `Votre demande ne peut pas depasser de ${employe.plafonnement} jours pour ce mois-ci. Vous avez déjà pris ${moisjour} jours ce mois-ci.Le nombre de jours restants que vous pouvez encore prendre ce mois-ci est de ${restant}`,
          });
        }
      }

      // Vérifier solde
      const joursDemande = parseFloat(req.body.jours_absence);

      if (!employe) {
        return res.status(404).json({ error: "Employé non trouvé" });
      }

      if (employe.solde_employe < joursDemande) {
        return res.status(400).json({
          error: `Solde insuffisant pour prendre ce congé. Votre solde est ${employe.solde_employe} jours.`,
        });
      }

      
  const newsolde = employe.solde_employe - joursDemande;

  // Mettez à jour le solde dans l'objet employé
  employe.solde_employe = newsolde;

      await employe.save();

      const exist = await doublons(
        id_employe,
        id_absence,
        dateDebutJS,
        dateFin
      );
      if (exist)
        return res
          .status(400)
          .json({ error: "Une demande similaire existe déjà." });
      const dateRetour = calculerDateRetour(
        dateFin,
        durefin,
        duredebut,
        dateDebut
      );

      const nouvelleDemande = await Demande.create({
        id_employe,
        id_absence,
        date_debut: dateDebutJS,
        date_fin: dateFin,
        date_retour: dateRetour,
        date_demande: new Date(),
        jours_absence: joursAbsence,
        duredebut,
        durefin,
        motif: motifSpecial,
        surplus,
        solde_employe:newsolde,
      });

      return res.status(201).json({
        demandeNonSpeciale: nouvelleDemande,
        message: "Demande non spéciale créée avec succès.",
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/tabledemande", checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']),async (req, res) => {
  try {
    const demandes = await Demande.findAll({
      include: {
        model: Employe,
        as: "personnel", // Utiliser l'alias défini dans l'association
        attributes: [
          "nom_employe",
          "pre_employe",
          "poste",
          "matricule",
        ], // Sélectionner seulement le nom et le prénom
      },
      attributes: [
        "date_debut",
        "date_fin",
        "date_retour",
        "motif",
        "jours_absence",
        "id_demande",
        "solde_employe",
        "fichier"

      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(demandes); // Envoyer les résultats en JSON
  } catch (error) {
    console.error("Erreur lors de la récupération des demandes :", error);
    res.status(500).json({
      error: "Une erreur est survenue lors de la récupération des demandes.",
    });
  }
});


//recherche sur le tableau filtrage
router.get("/filtrage", checktokenmiddlware, checkRole(['ADMINISTRATEUR', 'UTILISATEUR']), async (req, res) => {
  const { recherche = '', mois = null, annee = null, date_debut = null, date_fin = null } = req.query;

  try {
      // Conditions de recherche pour le nom ou le prénom de l'employé
      const employeConditions = {
          [Op.or]: [
              { nom_employe: { [Op.like]: `%${recherche}%` } },
              { pre_employe: { [Op.like]: `%${recherche}%` } },
              { matricule: { [Op.like]: `%${recherche}%` } },


          ]
      };

      const demandeConditions = {};

      if (mois && annee) {
          demandeConditions[Op.and] = [
              literal(`MONTH(date_debut) = ${parseInt(mois, 10)}`),
              literal(`YEAR(date_debut) = ${parseInt(annee, 10)}`)
          ];
      } else if (mois) {
          demandeConditions[Op.and] = [
              literal(`MONTH(date_debut) = ${parseInt(mois, 10)}`)
          ];
      } else if (annee) {
          demandeConditions[Op.and] = [
              literal(`YEAR(date_debut) = ${parseInt(annee, 10)}`)
          ];
      }

      // Recherche par plage de dates
      if (date_debut && date_fin) {
          // Recherche des demandes dont la date_debut est entre date_debut et date_fin
          demandeConditions.date_debut = {
              [Op.between]: [
                  new Date(date_debut).setHours(0, 0, 0, 0),  // Début de la première date
                  new Date(date_fin).setHours(23, 59, 59, 999)  // Fin de la dernière date
              ]
          };
      } else if (date_debut) {
          // Recherche des demandes dont la date_debut est exactement à date_debut (même jour, toutes heures)
          demandeConditions.date_debut = {
              [Op.between]: [
                  new Date(date_debut).setHours(0, 0, 0, 0),  // Début de la journée
                  new Date(date_debut).setHours(23, 59, 59, 999)  // Fin de la journée
              ]
          };
      }

      // Requête pour récupérer les demandes d'absence avec les conditions d'employé et de demande
      const demandes = await Demande.findAll({
          where: demandeConditions,
          include: [
              {
                  model: Employe,
                  as: 'personnel',
                  where: employeConditions
              }
          ]
      });

      res.json(demandes);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Une erreur est survenue lors de la recherche des demandes.' });
  }
});

router.delete('/deletedemande/:id',checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']),  async (req, res) => {
  const { id } = req.params;

  try {
      const demande = await Demande.findByPk(id);

      if (!demande) {
          return res.status(404).json({ message: "Demande non trouvée" });
      }

      await demande.destroy();

      res.status(200).json({ message: "Demande supprimée avec succès" });
  } catch (error) {
      console.error(error);
      res.status(500).json({
          message: "Erreur lors de la suppression de la demande",
          error: error.message
      });
  }
});
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');  // Répertoire de destination
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);  // Utilise le nom de fichier d'origine
  }
});


const upload = multer({ storage: storage });
const fs = require('fs');
const { log } = require("console");

// Route pour mettre à jour la demande et gérer l'upload d'un fichier
router.put('/fichier/:id',checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']),  upload.single('fichier'), async (req, res) => {
  const demandeId = req.params.id;

  try {
    // Chercher la demande dans la base de données
    const demande = await Demande.findByPk(demandeId);

    if (!demande) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }

    // Récupérer l'ancien fichier
    const ancienFichier = demande.fichier; // Nom du fichier précédemment enregistré
    console.log(`Ancien fichier : ${ancienFichier}`);

    // Vérifier si un ancien fichier existe
    if (ancienFichier) {
      const ancienFichierPath = path.join(__dirname, 'uploads', ancienFichier);
      console.log(`Chemin de l'ancien fichier : ${ancienFichierPath}`);

      // Vérifier l'existence de l'ancien fichier
      if (fs.existsSync(ancienFichierPath)) {
        // Supprimer l'ancien fichier
        fs.unlink(ancienFichierPath, (err) => {
          if (err) {
            console.error(`Erreur lors de la suppression du fichier : ${ancienFichierPath}`, err);
            return res.status(500).json({ message: 'Erreur lors de la suppression du fichier existant' });
          }
          console.log(`Ancien fichier supprimé avec succès : ${ancienFichierPath}`);
        });
      } else {
        console.log(`L'ancien fichier n'existe pas : ${ancienFichierPath}`);
      }
    } else {
      console.log('Aucun ancien fichier à supprimer.');
    }

    // Mettre à jour avec le nouveau fichier
    if (req.file) {
      // Utiliser le nom original du fichier uploadé
      demande.fichier = req.file.originalname; 
    } else {
      // Si aucun fichier n'est fourni, garder le fichier existant
      demande.fichier = ancienFichier || demande.fichier; 
    }

    // Mise à jour des autres champs (si nécessaire)
    const { date_debut, date_fin, motif } = req.body;
    demande.date_debut = date_debut || demande.date_debut;
    demande.date_fin = date_fin || demande.date_fin;
    demande.motif = motif || demande.motif;

    // Sauvegarder les modifications
    await demande.save();

    res.status(200).json({ message: 'Demande mise à jour avec succès', demande });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la demande', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la demande', error });
  }
});
// Route pour télécharger le fichier associé à une demande et le renvoyer en Base64
router.get('/download/:id',checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']), async (req, res) => {
  const demandeId = req.params.id;

  try {
    // Rechercher la demande par son ID dans la base de données
    const demande = await Demande.findByPk(demandeId);
    
    // Vérifier si la demande ou le fichier associé existe
    if (!demande || !demande.fichier) {
      console.log('Demande ou fichier non trouvé', { demande });
      return res.status(404).json({ message: 'Demande ou fichier non trouvé' });
    }

    // Construire le chemin complet du fichier
    const filePath = path.join('/home/felana/Felaniaina/DA2I/SociétéMiezaka/back/uploads', demande.fichier);
    console.log('Chemin du fichier :', filePath);

    // Lire le fichier
    fs.readFile(filePath, (err, data) => {
      if (err) {
        return res.status(404).json({ message: 'Fichier non trouvé', error: err });
      }

      // Convertir le fichier en Base64
      const base64File = Buffer.from(data).toString('base64');

      // Obtenir l'extension du fichier pour que le client puisse identifier le type de fichier
      const fileExtension = path.extname(demande.fichier).slice(1); // Supprimer le "." de l'extension
      const filename = demande.fichier;

      // Renvoyer la réponse avec le fichier encodé en Base64 et ses métadonnées
      res.status(200).json({
        base64File,
        fileExtension,
        filename
      });
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la demande:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de la demande', error });
  }
});

module.exports = router;
