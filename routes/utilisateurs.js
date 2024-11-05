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
router.post('/ajout',(req, res) => {
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
    if (password !== undefined) {
      const saltRounds = 10; // Nombre de tours pour le salage
      user.password = await bcrypt.hash(password, saltRounds);
    }
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
      // Générer un OTP
      const otp = crypto.randomInt(100000, 999999); // Génère un code à 6 chiffres

      // Stocker l'OTP dans un cache temporaire avec une expiration de 10 minutes
      otpCache[email] = { otp, expireAt: Date.now() + 10 * 60 * 1000 };
      console.log('OTP généré pour', email, ':', otpCache[email]);

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
  console.log('Données reçues:', req.body); // Ajoutez cette ligne pour le débogage

  try {
    // Normaliser l'email pour assurer la cohérence
    const normalizedEmail = email.toLowerCase();

    // Vérifier que le nouveau mot de passe est fourni
    if (!nouveauMotDePasse || nouveauMotDePasse.trim() === '') {
      return res.status(400).json({ message: 'Le nouveau mot de passe est requis.' });
    }

    // Vérifier si un OTP a été généré pour cet email
    const otpData = otpCache[normalizedEmail];

    // Debugging : afficher le cache OTP avant vérification
    console.log('Cache OTP lors de la vérification:', otpCache);

    if (!otpData) {
      return res.status(400).json({ message: 'Aucun OTP trouvé pour cet email.' });
    }

    console.log(`Code fourni: ${code}  | Code stocké: ${otpData.otp}`);
    console.log(`Expiration stockée: ${new Date(otpData.expireAt)}  | Date actuelle: ${new Date()}`);

    // Vérifier si le code correspond et n'est pas expiré
    if (otpData.otp !== parseInt(code) || otpData.expireAt < Date.now()) {
      return res.status(400).json({ message: 'Code invalide ou expiré.' });
    }

    // Rechercher l'utilisateur par email
    const utilisateur = await Utilisateur.findOne({ where: { email: normalizedEmail } });

    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Hacher le nouveau mot de passe
    const hash = await bcrypt.hash(nouveauMotDePasse, 10);

    // Mettre à jour le mot de passe de l'utilisateur
    utilisateur.password = hash;
    await utilisateur.save();

    // Supprimer l'OTP du cache
    delete otpCache[normalizedEmail];

    res.json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur est survenue. Veuillez réessayer plus tard.' });
  }
});
function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1]; // Récupérer le token à partir du header

  if (!token) {
    return res.status(403).json({ error: 'Token requis' });
  }

  jwt.verify(token, secret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }

    req.user = user; // Stocker les informations de l'utilisateur dans `req.user`
    next();
  });
}


// Route pour mettre à jour le profil utilisateur
router.put('/api/update', async (req, res) => {
  const { nom, email, currentPassword, newPassword } = req.body;

  try {
    // Recherche de l'utilisateur par email
    const user = await Utilisateur.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérification du mot de passe actuel
    if (newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
      }
      // Mise à jour du mot de passe
      user.password = await bcrypt.hash(newPassword, 10);
    }

    // Mise à jour des autres informations seulement si elles sont fournies
    if (nom) {
      user.nom = nom;
    }
    if (email) {
      user.email = email;
    }

    await user.save(); // Sauvegarder les modifications

    // Génération d'un nouveau token avec les nouvelles informations
    const token = jwt.sign(
      {
        id_user: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Renvoi du nouveau token et d'un message de succès
    res.json({ success: true, message: 'Mise à jour réussie', token });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour des informations', error: error.message });
  }
});

module.exports = router;
