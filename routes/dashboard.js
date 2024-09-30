const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const Demande = require("../models/demande");
const Employe = require('../models/employe'); // Importer le modèle Employe
const router = express.Router();
const  checkRole = require('../jsontokenweb/chekrole'); // Si dans le même fichier
const checktokenmiddlware = require('../jsontokenweb/check');


// Route pour obtenir les statistiques d'absence
// Route pour obtenir les statistiques d'absence, avec ou sans filtre par nom/prénom
router.get('/state',checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']), async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        
        const { nom_employe, pre_employe, startDate, endDate } = req.query;

        const start = startDate || `${currentYear}-01-01`;
        const end = endDate || `${currentYear}-12-31`;

        let employeConditions = {};

        if (nom_employe) {
            employeConditions.nom_employe = { [Op.like]: `%${nom_employe}%` }; 
        }
        if (pre_employe) {
            employeConditions.pre_employe = { [Op.like]: `%${pre_employe}%` }; 
        }

        let employe;
        if (nom_employe || pre_employe) {
            employe = await Employe.findOne({
                where: employeConditions
            });

            if (!employe) {
                return res.status(404).json({ error: 'Aucun employé trouvé avec ce nom et prénom.' });
            }
        }

        let conditions = {
            date_debut: {
                [Op.between]: [start, end]
            }
        };

        if (employe) {
            conditions.id_employe = employe.id_employe;
        }

        const totalAbsences = await Demande.count({
            where: conditions
        });

        const absencesByMonth = await Demande.findAll({
            attributes: [
                [fn('COUNT', col('id_demande')), 'total_absences'],
                [fn('MONTH', col('date_debut')), 'month']
            ],
            where: conditions,
            group: [fn('MONTH', col('date_debut'))],
            order: [[literal('month'), 'ASC']]
        });

        res.json({
            totalAbsences,
            absencesByMonth
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques d\'absence:', error);
        res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des statistiques d\'absence.' });
    }
});


module.exports = router;


