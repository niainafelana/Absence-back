const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const Demande = require("../models/demande");
const Employe = require('../models/employe');
const Absence = require('../models/absence');
const sequelize = require('../db');

const router = express.Router();
const checkRole = require('../jsontokenweb/chekrole'); 
const checktokenmiddlware = require('../jsontokenweb/check');

router.get('/depatementnylisitra',  async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const { departement, startDate, endDate, filtre } = req.query;

        const start = startDate || `${currentYear}-01-01`;
        const end = endDate || `${currentYear}-12-31`;

        let employeConditions = {};
    
        if (departement) {
            employeConditions.departement = { [Op.like]: `%${departement}%` };
        }

        let employe;
        if (departement) {
            employe = await Employe.findOne({ where: employeConditions, attributes: [
                'id_employe',
                'nom_employe',
                'pre_employe',
                'sexe',
                'poste',
                'matricule',
                'departement',
                'solde_employe',
                'plafonnement',
                'plafonnementbolean',
                'last_solde_update',
            ]});            if (!employe) {
                return res.status(404).json({ error: 'Aucun employé trouvé avec ce nom et prénom.' });
            }
        }

        // Définition des conditions de filtrage
        let conditions = {
            date_debut: { [Op.between]: [start, end] }
        };

        if (employe) {
            conditions.id_employe = employe.id_employe;
        }

        // Total d'absences
        const totalAbsences = await Demande.count({ where: conditions });
        const totalDuree = await Demande.sum('jours_absence', { where: conditions }); // Calcul de la somme des durées

        let absencesByFilter;

        // Application du filtre modifié
        if (filtre === 'jour') {
            absencesByFilter = await Demande.findAll({
                attributes: [
                    [fn('COUNT', col('id_demande')), 'total_absences'],
                    [fn('DATE', col('date_debut')), 'date'], // Récupère la date complète
                    [fn('SUM', col('jours_absence')), 'total_duree'] // Somme des durées pour le filtre jour
                ],
                where: conditions,
                group: [fn('DATE', col('date_debut'))],
                order: [[literal('date'), 'ASC']]
            });
        } else if (filtre === 'semaine') {
            absencesByFilter = await Demande.findAll({
                attributes: [
                    [fn('COUNT', col('id_demande')), 'total_absences'],
                    [fn('WEEK', col('date_debut')), 'week'],
                    [fn('SUM', col('jours_absence')), 'total_duree'] // Somme des durées pour le filtre semaine
                ],
                where: conditions,
                group: [fn('WEEK', col('date_debut'))],
                order: [[literal('week'), 'ASC']]
            });
        } else if (filtre === 'mois') {
            absencesByFilter = await Demande.findAll({
                attributes: [
                    [fn('COUNT', col('id_demande')), 'total_absences'],
                    [fn('MONTH', col('date_debut')), 'month'],
                    [fn('SUM', col('jours_absence')), 'total_duree'] // Somme des durées pour le filtre mois
                ],
                where: conditions,
                group: [fn('MONTH', col('date_debut'))],
                order: [[literal('month'), 'ASC']]
            });
        } else if (filtre === 'annee') {
            absencesByFilter = await Demande.findAll({
                attributes: [
                    [fn('COUNT', col('id_demande')), 'total_absences'],
                    [fn('YEAR', col('date_debut')), 'year'],
                    [fn('SUM', col('jours_absence')), 'total_duree'] // Somme des durées pour le filtre année
                ],
                where: conditions,
                group: [fn('YEAR', col('date_debut'))],
                order: [[literal('year'), 'ASC']]
            });
        } else {
            // Par défaut, on retourne les absences par mois
            absencesByFilter = await Demande.findAll({
                attributes: [
                    [fn('COUNT', col('id_demande')), 'total_absences'],
                    [fn('MONTH', col('date_debut')), 'month'],
                    [fn('SUM', col('jours_absence')), 'total_duree'] // Somme des durées pour le filtre par défaut
                ],
                where: conditions,
                group: [fn('MONTH', col('date_debut'))],
                order: [[literal('month'), 'ASC']]
            });
        }

        // Total d'absences par type, avec le filtre appliqué
        let totalAbsencesParType;
        if (filtre === 'jour') {
            totalAbsencesParType = await Demande.findAll({
                attributes: [
                    [fn('COUNT', col('Demande.id_demande')), 'total_absences'],
                    [fn('DATE', col('date_debut')), 'date'], // Récupère la date complète
                    [sequelize.col('absence.nom_absence'), 'type_absence'],
                    [fn('SUM', col('jours_absence')), 'total_duree'] // Somme des durées par type
                ],
                include: [
                    {
                        model: Absence,
                        as: 'absence',
                        attributes: []
                    }
                ],
                where: conditions,
                group: [fn('DATE', col('date_debut')), 'absence.nom_absence'],
                order: [[literal('date'), 'ASC']]
            });
        } else if (filtre === 'semaine') {
            totalAbsencesParType = await Demande.findAll({
                attributes: [
                    [fn('COUNT', col('Demande.id_demande')), 'total_absences'],
                    [fn('WEEK', col('date_debut')), 'week'],
                    [sequelize.col('absence.nom_absence'), 'type_absence'],
                    [fn('SUM', col('jours_absence')), 'total_duree'] // Somme des durées par type
                ],
                include: [
                    {
                        model: Absence,
                        as: 'absence',
                        attributes: []
                    }
                ],
                where: conditions,
                group: [fn('WEEK', col('date_debut')), 'absence.nom_absence'],
                order: [[literal('week'), 'ASC']]
            });
        } else if (filtre === 'mois') {
            totalAbsencesParType = await Demande.findAll({
                attributes: [
                    [fn('COUNT', col('Demande.id_demande')), 'total_absences'],
                    [fn('MONTH', col('date_debut')), 'month'],
                    [sequelize.col('absence.nom_absence'), 'type_absence'],
                    [fn('SUM', col('jours_absence')), 'total_duree'] // Somme des durées par type
                ],
                include: [
                    {
                        model: Absence,
                        as: 'absence',
                        attributes: []
                    }
                ],
                where: conditions,
                group: [fn('MONTH', col('date_debut')), 'absence.nom_absence'],
                order: [[literal('month'), 'ASC']]
            });
        } else if (filtre === 'annee') {
            totalAbsencesParType = await Demande.findAll({
                attributes: [
                    [fn('COUNT', col('Demande.id_demande')), 'total_absences'],
                    [fn('YEAR', col('date_debut')), 'year'],
                    [sequelize.col('absence.nom_absence'), 'type_absence'],
                    [fn('SUM', col('jours_absence')), 'total_duree'] // Somme des durées par type
                ],
                include: [
                    {
                        model: Absence,
                        as: 'absence',
                        attributes: []
                    }
                ],
                where: conditions,
                group: [fn('YEAR', col('date_debut')), 'absence.nom_absence'],
                order: [[literal('year'), 'ASC']]
            });
        } else {
            totalAbsencesParType = await Demande.findAll({
                attributes: [
                    [fn('COUNT', col('Demande.id_demande')), 'total_absences'],
                    [fn('MONTH', col('date_debut')), 'month'],
                    [sequelize.col('absence.nom_absence'), 'type_absence'],
                    [fn('SUM', col('jours_absence')), 'total_duree'] // Somme des durées par type
                ],
                include: [
                    {
                        model: Absence,
                        as: 'absence',
                        attributes: []
                    }
                ],
                where: conditions,
                group: [fn('MONTH', col('date_debut')), 'absence.nom_absence'],
                order: [[literal('month'), 'ASC']]
            });
        }

        return res.status(200).json({
            totalAbsences,
            totalDuree, // Ajoutez ici pour inclure la durée totale
            absencesByFilter,
            totalAbsencesParType,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des données.' });
    }
});

module.exports = router;
