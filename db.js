require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.db_name,
    process.env.db_user,
    process.env.db_pass,
    {
        host: process.env.db_host,
        port: process.env.db_port,
        dialect: 'mysql',
        timezone: process.env.db_timezone,
        logging: false,
        
    }
);
(async () => {
    try {
        await sequelize.authenticate();
        console.log('Connexion bd établie avec succès');
    } catch (error) {
        console.error('Connexion bd error:', error);
    }
})();

module.exports = sequelize;
