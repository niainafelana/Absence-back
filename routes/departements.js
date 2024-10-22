const express = require('express');
const router = express.Router();
const { Op } = require('sequelize'); 
const Departement = require('../models/departement');
const  checkRole = require('../jsontokenweb/chekrole'); // Si dans le même fichier
const checktokenmiddlware = require('../jsontokenweb/check');
// Route pour ajouter un nouveau département
router.post('/ajoutdepart',checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']), async (req, res) => {
    const { code_departement, description, fonction, nom_departement } = req.body;

    try {
        const departementExiste = await Departement.findOne({
            where: {
                [Op.or]: [
                    { code_departement: code_departement },
                    { nom_departement: nom_departement }
                ]
            }
        });

        if (departementExiste) {
            return res.status(400).json({
                message: "Un département avec ce code ou ce nom existe déjà"
            });
        }

        const nouveauDepartement = await Departement.create({
            code_departement,
            description,
            fonction,
            nom_departement
        });

        res.status(201).json({
            message: "Département créé avec succès",
            departement: nouveauDepartement
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Erreur lors de la création du département",
            error: error.message
        });
    }
});
// Route pour récupérer tous les départements triés par date de création
router.get("/recuperation",checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']),  async (req, res) => {
    try {
        const utile = await Departement.findAll({
            order: [["createdAt", "DESC"]],
        });
        res.json({ message: "Liste des departements", data: utile });
    } catch (err) {
        res
            .status(500)
            .json({ message: "Erreur de la base de données", error: err });
    }
  });

// Route pour modifier un département
router.put('/modifiedepart/:id',checktokenmiddlware, checkRole(['ADMINISTRATEUR']),  async (req, res) => {
    const { id } = req.params; 
    const { code_departement, description, fonction, nom_departement } = req.body;

    try {
        const departement = await Departement.findByPk(id);

        if (!departement) {
            return res.status(404).json({ message: "Département non trouvé" });
        }
        departement.code_departement = code_departement || departement.code_departement;
        departement.description = description || departement.description;
        departement.fonction = fonction || departement.fonction;
        departement.nom_departement = nom_departement || departement.nom_departement;

        await departement.save();

        res.status(200).json(departement);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Erreur lors de la mise à jour du département",
            error: error.message
        });
    }
});

// Route pour supprimer un département
router.delete('/deletedepart/:id',checktokenmiddlware, checkRole(['ADMINISTRATEUR']),  async (req, res) => {
    const { id } = req.params;

    try {
        const departement = await Departement.findByPk(id);

        if (!departement) {
            return res.status(404).json({ message: "Département non trouvé" });
        }

        await departement.destroy();

        res.status(200).json({ message: "Département supprimé avec succès" });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Erreur lors de la suppression du département",
            error: error.message
        });
    }
});
// Route pour récupérer tous les noms de départements
router.get('/nomdepartement',checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']),  async (req, res) => {
    try {
        const departements = await Departement.findAll({
            attributes: ['nom_departement'] 
        });

        res.json(departements);
    } catch (error) {
        console.error('Erreur lors de la récupération des départements:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des départements' });
    }
});

module.exports = router;
