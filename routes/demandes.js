const express = require("express");
const Employe = require("../models/employe");
const Demande = require("../models/demande");
const Absence = require("../models/absence");
const { Op } = require("sequelize");
const router = express.Router();

// Ajout demande et ses conditions
router.put("", async (req, res) => {
  const { id_employe, id_absence, datedeb, datefin, duredebut, durefin } =
    req.body;

  // Vérification des données manquantes
  if (
    !id_employe ||
    !id_absence ||
    !datedeb ||
    !datefin ||
    !duredebut ||
    !durefin
  ) {
    return res.status(400).json({ message: "Données manquantes" });
  }

  try {
    const employe = await Employe.findByPk(id_employe);
    const absence = await Absence.findByPk(id_absence);

    if (!employe || !absence) {
      return res.status(404).json({ error: "Employé ou congé non trouvé" });
    }
    // calcul jours d'absence pour la nouvelle demande
    const dateDebut = new Date(datedeb);
    const dateFin = new Date(datefin);
    let joursAbsence = 0;

    // Calcul des jours d'absence en fonction des règles spécifiées
    if (dateDebut.getTime() === dateFin.getTime()) {
      joursAbsence = duredebut === "journee" ? 1 : 0.5; // même jour, une journée entière ou demi-journée
    } else {
      const differenceEnJours = (dateFin - dateDebut) / (1000 * 60 * 60 * 24);
      const joursComplet = differenceEnJours - 1; // nombre de jours complets entre les deux dates
      const debutJournee = duredebut === "journee" ? 1 : 0.5; // durée date deb
      const finJournee = durefin === "journee" ? 1 : 0.5; // durée de la dernière journée

      joursAbsence = joursComplet + debutJournee + finJournee;
    }

    let totalJoursMois = 0;

    // absence non special
    if (absence.type !== "special") {
      // calcul total des jours d'absence pour le mois en cours
      const debutMois = new Date(
        dateDebut.getFullYear(),
        dateDebut.getMonth(),
        1
      );
      const finMois = new Date(
        dateDebut.getFullYear(),
        dateDebut.getMonth() + 1,
        0
      );

      // recherche des demandes d'absence du même employé et mois
      const demandesMois = await Demande.findAll({
        where: {
          id_employe,
          date_debut: {
            [Op.between]: [debutMois, finMois],
          },
        },
      });

      // calcul total des jours d'absence pour le mois
      totalJoursMois = demandesMois.reduce((total, d) => {
        const debut = new Date(d.date_debut);
        const fin = new Date(d.date_fin);
        const dureDebut = d.duredebut === "journee" ? 1 : 0.5;
        const dureFin = d.durefin === "journee" ? 1 : 0.5;
        return (
          total +
          ((fin - debut) / (1000 * 60 * 60 * 24) - 1) +
          dureDebut +
          dureFin
        );
      }, 0);
      // ajout jours d'absence
      const totalAvecNouvelleDemande = totalJoursMois + joursAbsence;
      // vérification si la demande dépasse la limite de 2,5 jours par mois

      if (totalAvecNouvelleDemande > 2.5) {
        const message =
          totalJoursMois > 0
            ? `La demande dépasse la limite de 2,5 jours par mois. Vous avez déjà pris ${totalJoursMois} jours ce mois-ci.`
            : "La demande dépasse la limite de 2,5 jours par mois.";
        return res.status(400).json({
          error: message,
        });
      }
      // maj le solde de l'employé

      employe.solde_employe -= joursAbsence;
      await employe.save();
    }

    if (absence.seulement_femmes && employe.sexe === "H") {
      return res.status(400).json({ error: "Le congé est réservé aux femmes" });
    }

    // création demande d'absence
    const demande = await Demande.create({
      id_employe,
      id_absence,
      date_debut: dateDebut,
      date_fin: dateFin,
      duredebut,
      durefin,
      jours_absence: joursAbsence,
    });

    res.status(201).json({
      demande,
      message: `Demande créée avec succès. Jours d'absence pris: ${joursAbsence}.`,
    });
  } catch (error) {
    console.error("Erreur de serveur:", error);
    res
      .status(500)
      .json({ error: "Une erreur s'est produite.", details: error.message });
  }
});

module.exports = router;
