const express = require('express');
const router = express.Router();
const { Op } = require('sequelize'); 
const Poste = require('../models/poste');
const Departement = require('../models/departement')
const  checkRole = require('../jsontokenweb/chekrole'); // Si dans le même fichier
const checktokenmiddlware = require('../jsontokenweb/check');
router.put('/ajoutposte',checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']), async (req, res) => {
    const { code_departement, description, fonction } = req.body;

    try {
        const existingPoste = await Poste.findOne({
            where: {
                [Op.or]: [
                    { fonction: fonction },
                    { description: description }
                ]
            }
        });

        if (existingPoste) {
            return res.status(400).json({ message: "Un poste avec le même code ou description existe déjà." });
        }

        const poste = await Poste.create({ code_departement, description, fonction });
        res.status(201).json({
            message: "Poste créé avec succès",
            poste: poste
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur lors de l'ajout du poste", error: error.message });
    }
});


// Route pour récupérer tous les postes
router.get('/recuposte',checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']), async (req, res) => {
    try {
        const postes = await Poste.findAll({
            order: [['createdAt', 'DESC']],
        });
        res.status(200).json(postes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur lors de la récupération des postes", error: error.message });
    }
});

router.put('/modifposte/:id', checktokenmiddlware, checkRole(['ADMINISTRATEUR']),async (req, res) => {
    const { id } = req.params; 
    const { code_departement, description, fonction } = req.body;

    try {
        const poste = await Poste.findByPk(id);

        if (!poste) {
            return res.status(404).json({ message: "Poste non trouvé" });
        }

        poste.code_departement = code_departement || poste.code_departement;
        poste.description = description || poste.description;
        poste.fonction = fonction || poste.fonction;

        await poste.save();

        res.status(200).json(poste);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Erreur lors de la mise à jour du poste",
            error: error.message
        });
    }
});

// Route pour supprimer un poste
router.delete('/deleteposte/:id',checktokenmiddlware, checkRole(['ADMINISTRATEUR']), async (req, res) => {
    const { id } = req.params;

    try {
        const poste = await Poste.findByPk(id);

        if (!poste) {
            return res.status(404).json({ message: "Poste non trouvé" });
        }

        await poste.destroy();

        res.status(200).json({ message: "Poste supprimé avec succès" });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Erreur lors de la suppression du poste",
            error: error.message
        });
    }
});


router.get('/pote/:nomDepartement', checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']),async (req, res) => {
    const { nomDepartement } = req.params;
    const getPostesByNomDepartement = async (nomDepartement) => {
        try {
            const result = await Departement.findOne({
                where: { nom_departement: nomDepartement },
                include: {
                    model: Poste,
                    required: true, 
                },
            });
    
            if (!result) {
                return `Aucun département trouvé avec le nom: ${nomDepartement}`;
            }
    
            return result.Postes; 
        } catch (error) {
            console.error('Erreur lors de la récupération des postes:', error);
            throw error;
        }
    };
    try {
        const postes = await getPostesByNomDepartement(nomDepartement);
        res.json(postes);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des postes' });
    }
});

//RECHERCHE PAR DESCRIPTION
router.get('/description', async (req, res) => {
    const { nom } = req.query; 
  
    try {
        const poste = await Poste.findAll({
            where: {
                [Op.or]: [
                    { description: { [Op.like]: `%${nom}%` } }
                ]
            },
            order: [['createdAt', 'DESC']],
        });
  
        if (poste.length === 0) {
            return res.status(204).send(); 
        }
  
        res.json({ message: 'Liste des départements', data: poste });
    } catch (err) {
        res.status(500).json({ message: 'Erreur de la base de données', error: err });
    }
});

module.exports = router;
