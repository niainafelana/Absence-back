require('dotenv').config();
/***importation des modules */
const express = require('express');
const cors = require('cors');

/**import de la connexion bd */
const db = require('./db');
const Employe = require('./models/employe'); // Importer le modèle Employe
const Absence = require('./models/absence');//Importation modèle Absence
const Demande = require('./models/demande');//Importation modèle demande
const Utilisateur = require('./models/utilisateur');//Importation modèle 
/**initialisation de l'api */
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));




//Importation des routes
const employe_router = require('./routes/employes');//importation route employe
const demande_router =require('./routes/demandes');
const  absence_router = require('./routes/absences');
const utilisateur_router = require('./routes/utilisateurs');
const dashboard_router= require('./routes/dashboard');

/****Mise en place du routage */
app.use('/employes', employe_router); //les employés
app.use('/demandes', demande_router);
app.use('/absences', absence_router);
app.use('/utile',utilisateur_router);
app.use('/dashboard',dashboard_router);
/**Demarrer serveur avec test bd */
(async () => {
    try {
        await db.authenticate();
        console.log('Database connection ok');

     
        // Synchroniser la base de données avec le schéma actuel (ajouter la nouvelle table)
        await db.sync({ alter: true }); 
        console.log('Database synchronized and updated');

        app.listen(process.env.server_port, () => {
            console.log(`Server running on port ${process.env.server_port}`);
        });
    } catch (err) {
        console.log('Database error', err);
    }
})();

