const express = require('express');
const Absence = require('../models/absence');
const cron = require('node-cron');
let router = express.Router()


router.put('', (req, res) => {
    const {name, duree,type, femme  } = req.body;
    
    if (!name || !duree || !type || !femme) {
      return res.status(400).json({ message: 'Donnée manquer' });
    }
    
    Absence.create({
      nom_absence: name,
      duree: duree,
      type:type,
      seulement_femmes: femme,
    })
    .then(absence => res.json({ message: 'Absence bien créé', data: absence }))
    .catch(err => res.status(500).json({ message: 'db error', error: err }));
  });
  module.exports = router;
