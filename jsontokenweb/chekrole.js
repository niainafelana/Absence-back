// Middleware pour vérifier le rôle de l'utilisateur
const jwt = require('jsonwebtoken');

// Middleware pour vérifier le rôle de l'utilisateur
const checkRole = (roles) => {
  return (req, res, next) => {
    const userRole = req.user.role;

    if (!roles.includes(userRole)) {
      return res.status(403).json({ message: "Accès refusé." });
    }
    next();
  };
};

  
  module.exports = checkRole;
  