const express = require('express');
const bcrypt = require('bcrypt');
const Utilisateur = require('../models/utilisateur'); 
const router = express.Router();
const jwt = require('jsonwebtoken');
const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10);
const  checkRole = require('../jsontokenweb/chekrole');
const checktokenmiddlware = require('../jsontokenweb/check');
const { Op } = require("sequelize"); // Importation des opérateurs Sequelize

//ajout utilisateur
router.post('/ajout',checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']),(req, res) => {
  const { nom, role, email, password } = req.body;
  console.log(req.body);  // Affiche les données reçues
  if (!nom || !role || !email || !password) {
    return res.status(400).json({ message: 'Donnée manquante' });
  }

  Utilisateur.findOne({ where: { email: email }, raw: true })
    .then(user => {
      if (user !== null) {
        return res.status(400).json({ message: `Utilisateur existe déjà: ${nom}` });
      }

      return bcrypt.hash(password, saltRounds);
    })
    .then(hasher => {
      return Utilisateur.create({
        nom: nom,
        email: email,
        role: role,
        password: hasher,
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
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email ou mot de passe manqu' });
  }

  Utilisateur.findOne({ where: { email: email }, raw: true })
    .then(user => {
      if (!user) {
        return res.status(401).json({ message: 'Utilisateur non trouvé' });
      }

      return bcrypt.compare(password, user.password).then(motdepasse => {
        if (!motdepasse) {
          return res.status(401).json({ message: 'Mot de passe incorrect' });
        }

        const token = jwt.sign(
          {
            id_user: user.id_user,
            nom:user.nom,
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
router.get("/lisitrauser", checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']),async (req, res) => {
  try {
      const utile = await Utilisateur.findAll({
          order: [["createdAt", "DESC"]],
      });
      res.json({ message: "Liste des utilisateurs", data: utile });
  } catch (err) {
      res
          .status(500)
          .json({ message: "Erreur de la base de données", error: err });
  }
});

router.patch('/modifeuser/:id',checktokenmiddlware, checkRole(['ADMINISTRATEUR']), async (req, res) => {
  const { id } = req.params;
  const { nom, email, role, password} = req.body;

  try {
    const user = await Utilisateur.findOne({ where: { id: id } });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    user.nom = nom !== undefined ? nom : user.nom;
    user.email = email !== undefined ? email : user.email;
    user.role = role !== undefined ? role : user.role;
    user.password = password !== undefined ? password : user.password;
    await user.save();

    res.json({ message: 'Utilisateur mis à jour avec succès', data: user });
  } catch (err) {
    res.status(500).json({ message: 'Erreur de la base de données', error: err });
  }
});
router.delete('/deleteuser/:id',checktokenmiddlware, checkRole(['ADMINISTRATEUR']), async (req, res) => {
  try {
    const user = await Utilisateur.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    await user.destroy();
    res.status(200).json({ message: 'Employé supprimé avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur.' });
  }
});
// Route pour filtrer les utilisateurs par nom
router.get('/utilisateurs', checktokenmiddlware, checkRole(['ADMINISTRATEUR','UTILISATEUR']),async (req, res) => {
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


const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Exemple de récupération d'utilisateurs avec Sequelize
let otpCache = {}; // Cache temporaire pour stocker les OTP

// Configurer nodemailer avec SMTP Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
   host: 'smtp.gmail.com',
   port: 465,
   secure: true,
  auth: {
    user: 'felaniainanicolette@gmail.com',
    pass: 'fial woxp chrj dvnk ', // Utilisez un mot de passe d'application généré via votre compte Google
  },
});

// Fonction pour envoyer l'email de réinitialisation avec l'OTP
function sendResetEmail(email, otp) {
  const mailOptions = {
    from: 'felaniainanicolette@gmail.com',
    to: email,
    subject: 'Votre code de réinitialisation de mot de passe',
    text: `Votre code de réinitialisation est : ${otp}. Ce code est valable pendant 10 minutes.`,
  }; 

  return transporter.sendMail(mailOptions);
}
router.post('/mdpoublie', async (req, res) => {
  const { email } = req.body;

  try {
    const users = await Utilisateur.findAll();
    const utilisateur = users.find(u => u.email === email);

    if (!utilisateur) {
      return res.status(404).json({ message: 'Adresse email non trouvée' });
    }

    // Générer un OTP
    const otp = crypto.randomInt(100000, 999999); // Génère un code à 6 chiffres

    // Stocker l'OTP dans un cache temporaire avec une expiration de 10 minutes
    otpCache[email] = { otp, expireAt: Date.now() + 10 * 60 * 1000 };

    // Envoyer l'OTP par email
    await sendResetEmail(email, otp);
    res.json({ message: 'OTP envoyé à votre adresse email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email' });
  }
});

// Fonction pour trouver un utilisateur par email
const findUserByEmail = async (email) => {
  try {
    // Rechercher l'utilisateur dans la base de données par email
    const utilisateur = await Utilisateur.findOne({ where: { email } });
    return utilisateur;
  } catch (error) {
    console.error("Erreur lors de la recherche de l'utilisateur par email :", error);
    throw error; // Renvoyer l'erreur pour la gérer plus tard
  }
};

router.post('/verifiercode', async (req, res) => {
  const { email, code, nouveauMotDePasse } = req.body;

  try {
    
    // Rechercher l'utilisateur par email
    const utilisateur = await findUserByEmail(email);

    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Vérifier si le code est correct et non expiré
    if (utilisateur.reset_code === code && utilisateur.reset_expiration > new Date()) {
      // Hacher le nouveau mot de passe
      const hash = await bcrypt.hash(nouveauMotDePasse, 10);

      // Mettre à jour le mot de passe et supprimer le code de réinitialisation
      utilisateur.mot_de_passe = hash;
      utilisateur.reset_code = null; // Supprimer le code
      utilisateur.reset_expiration = null; // Supprimer l'expiration
      await utilisateur.save();

      res.json({ message: 'Mot de passe réinitialisé avec succès.' });
    } else {
      res.status(400).json({ message: 'Code invalide ou expiré.' });
    }
  } catch (error) {
    // Gérer les erreurs éventuelles
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue. Veuillez réessayer plus tard.' });
  }
});

module.exports = router;
