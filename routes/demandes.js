const express = require("express");
const Employe = require("../models/employe");
const Demande = require("../models/demande");
const Absence = require("../models/absence");
const { Op } = require("sequelize");
const router = express.Router();
const moment = require("moment");


//fonction pour calculer dateretour
function calculerDateRetour(dateFin, durefin, duredebut, dateDebutJS) {
  let dateRetour = moment(dateFin);

  // si dateDebut et dateFin sont le même jour
  if (dateDebutJS.isSame(dateFin, "day")) {
    if (duredebut === "matin" && durefin === "matin") {
      dateRetour.set({ hour: 14, minute: 15 });
    } else if (duredebut === "apresmidi" && durefin === "apresmidi") {
      dateRetour.add(1, "days").set({ hour: 8, minute: 30 });
    } else if (duredebut === "matin" && durefin === "apresmidi") {
      dateRetour.add(1, "days").set({ hour: 8, minute: 30 });
    }
  } else {
    // si dateDebut et dateFin sont sur des jours différents
    if (durefin === "matin") {
      dateRetour.set({ hour: 14, minute: 0 });
    } else if (durefin === "apresmidi") {
      dateRetour.add(1, "days").set({ hour: 9, minute: 0 });
    }
  }

  //si dateRetour tombe un week-end
  if (dateRetour.isoWeekday() === 6) { // Samedi
    dateRetour.add(2, "days").set({ hour: 9, minute: 0 });
  } else if (dateRetour.isoWeekday() === 7) { // Dimanche
    dateRetour.add(1, "days").set({ hour: 9, minute: 0 });
  }

  return dateRetour.toDate();
}


//fonction pour trouver durefin(matin ou apresmidi)
function determinerDurefin(jours_absence, duredebut) {
  let durefin;
  if (jours_absence === 0.5) {
    durefin = duredebut; 
  } else if (jours_absence === 1) {
    if (duredebut === "matin") {
      durefin = "apresmidi";
    } else if (duredebut === "apresmidi") {
      durefin = "matin";
    }
  } else if (jours_absence > 1) {
    if (duredebut === "matin") {
      durefin = "matin"; 
    } else if (duredebut === "apresmidi") {
      durefin = "matin";
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
router.put("/ajout", async (req, res) => {
  const { id_employe, id_absence, datedeb, jours_absence, duredebut, motif } =
    req.body;

  try {
    const dateDebut = moment(datedeb, "YYYY-MM-DD", true);
    if (!dateDebut.isValid()) {
      return res
        .status(400)
        .json({ error: "La date de début fournie est invalide." });
    }

    const dateDebutJS = dateDebut.toDate();

    // Vérifiez l'existence de l'absence et de l'employé
    const absence = await Absence.findByPk(id_absence);
    if (!absence) {
      return res.status(404).json({ error: "Absence non trouvée" });
    }

    let employe = await Employe.findByPk(id_employe);
    if (!employe) {
      return res.status(404).json({ error: "Employé non trouvé" });
    }

    // Vérification si l'absence est réservée aux femmes
    if (absence.seulement_femmes && employe.sexe === "M") {
      return res.status(400).json({ error: "Le congé est réservé aux femmes" });
    }

    if (absence.type === "special") {
      const joursAbsenceSpeciale = absence.duree;
      const motifSpecial = absence.nom_absence;
      const dateFin = moment(dateDebutJS)
        .add(joursAbsenceSpeciale - 1, "days")
        .toDate();
      const durefin = determinerDurefin(joursAbsenceSpeciale, duredebut);
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
        dateDebutJS
      );
      const nouvelleDemande = await Demande.create({
        id_employe,
        id_absence,
        date_debut: dateDebutJS,
        date_fin: dateFin,
        date_retour: dateRetour,
        date_demande: new Date(),
        jours_absence: joursAbsenceSpeciale,
        duredebut,
        durefin,
        motif: motifSpecial,
      });

      return res.status(201).json({
        demandeSpeciale: nouvelleDemande,
        message: "Demande spéciale créée avec succès.",
      });
    } else {
      const joursAbsence = parseFloat(jours_absence);
      const motifSpecial = motif;
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
      const debutMois = new Date(
        dateDebutJS.getFullYear(),
        dateDebutJS.getMonth(),
        1
      );
      const finMois = new Date(
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
              type: "non special",
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
      const totalAvecNouvelleDemande = totalJoursMois + joursAbsence;
      if (employe.plafonnementbolean) {
        if (totalAvecNouvelleDemande > employe.plafonnement) {
          return res.status(400).json({
            error: `Votre demande ne peut pas depasser de ${employe.plafonnement} jours pour ce mois-ci. Vous avez déjà pris ${totalJoursMois} jours ce mois-ci.`,
          });
        }
      } else {
        if (totalAvecNouvelleDemande > 10) {
          return res.status(400).json({
            error: `La demande dépasse la limite de 10 jours pour ce mois-ci. Vous avez déjà pris ${totalJoursMois} jours ce mois-ci.`,
          });
        }
      }

      // Vérifier solde
      const joursDemande = parseFloat(req.body.jours_absence);

      if (!employe) {
        return res.status(404).json({ error: "Employé non trouvé" });
      }

      if (employe.solde_employe < joursDemande) {
        return res
          .status(400)
          .json({ error: "Solde insuffisant pour prendre ce congé." });
      }

      employe.solde_employe -= joursDemande;

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
        jours_absence,
        duredebut,
        durefin,
        motif: motifSpecial,
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
module.exports = router;
