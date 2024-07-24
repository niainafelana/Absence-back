require('dotenv').config();
/***importation des modules */
const express = require('express');
const cors = require('cors');

/**import de la connexion bd */
const db = require('./db');
const Employe = require('./models/employe'); // Importer le modèle Employe

/**initialisation de l'api */
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Importation des routes
const employe_router = require('./routes/employes');//importation route employe

/****Mise en place du routage */
app.use('/employes', employe_router); //les employés

/**Demarrer serveur avec test bd */
(async () => {
    try {
        await db.authenticate();
        console.log('Database connection ok');
        
       
        await db.sync(); 
        console.log('Database synchronized');
        
        app.listen(process.env.server_port, () => {
            console.log(`Server running on port ${process.env.server_port}`);
        });
    } catch (err) {
        console.log('Database error', err);
    }
})();
