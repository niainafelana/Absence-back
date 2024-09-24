const express = require('express');
const bcrypt = require('bcrypt');
const Utilisateur = require('../models/utilisateur'); 
const router = express.Router();
const jwt = require('jsonwebtoken');
const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10);
const  checkRole = require('../jsontokenweb/chekrole');
const checktokenmiddlware = require('../jsontokenweb/check');
//ajout utilisateur
router.post('/ajout', checktokenmiddlware, checkRole(['admin']),(req, res) => {
  const { nom, role, email, mdp } = req.body;

  if (!nom || !role || !email || !mdp) {
    return res.status(400).json({ message: 'Donnée manquante' });
  }

  Utilisateur.findOne({ where: { email: email }, raw: true })
    .then(user => {
      if (user !== null) {
        return res.status(400).json({ message: `Utilisateur existe déjà: ${nom}` });
      }

      return bcrypt.hash(mdp, saltRounds);
    })
    .then(hasher => {
      return Utilisateur.create({
        nom_user: nom,
        email: email,
        role: role,
        mpd_user: hasher
      });
    })
    .then(utilisateur => {
      res.status(201).json({ message: 'Utilisateur créé avec succès', utilisateur: utilisateur });
    })
    .catch(error => {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    });
});

//login des admins et utilisateurs
router.post('/login', (req, res) => {
  const { email, mdp } = req.body;

  if (!email || !mdp) {
    return res.status(400).json({ message: 'Email ou mot de passe manqu' });
  }

  Utilisateur.findOne({ where: { email: email }, raw: true })
    .then(user => {
      if (!user) {
        return res.status(401).json({ message: 'Utilisateur non trouvé' });
      }

      return bcrypt.compare(mdp, user.mpd_user).then(motdepasse => {
        if (!motdepasse) {
          return res.status(401).json({ message: 'Mot de passe incorrect' });
        }

        const token = jwt.sign(
          {
            id_user: user.id_user,
            nom_user:user.nom_user,
            email: user.email,
            role: user.role,
            
          },process.env.JWT_SECRET,{ expiresIn:process.env.JWT_EXPIRES_IN }
        );
        return res.status(200).json({
          message: 'Login réussi',
          access_token: token,
        });
      });
    })
    .catch(error => {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    });
});
router.get("/lisitra", checktokenmiddlware, checkRole(['utilisateur']),async (req, res) => {
  try {
      const utile = await Utilisateur.findAll({
          order: [["createdAt", "DESC"]],
      });
      res.json({ message: "Liste des employés", data: utile });
  } catch (err) {
      res
          .status(500)
          .json({ message: "Erreur de la base de données", error: err });
  }
});
module.exports = router;
