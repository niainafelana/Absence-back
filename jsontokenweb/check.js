const jwt = require('jsonwebtoken');

/****Exctraction du token */
const extractBearer = (authorization) => {
  if (typeof authorization !== 'string') {
    return false;
  }
  // on isole le token
  const matches = authorization.match(/(bearer)\s+(\S+)/i);
  return matches && matches[2];
};

/*****verification de la presence du token */
const checkTokenMiddleware = (req, res, next) => {
  if (!req.headers || !req.headers.authorization) {
    return res.status(401).json({ message: 'Authorization header is missing' });
  }
  const token = extractBearer(req.headers.authorization);
  
  if (!token) {
    return res.status(401).json({ message: 'Token manquant ou invalide.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
    if (err) {
      return res.status(401).json({ message: 'Token invalide.' });
    }
    req.user = decodedToken;
    next();
  });
};


module.exports = checkTokenMiddleware;
