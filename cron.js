const Employe = require("./models/employe");
const { Op } = require("sequelize");
const sequelize = require("./db");

async function updatesolde() {
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const employes = await Employe.findAll({
      where: {
        [Op.or]: [
          { last_solde_update: { [Op.is]: null } },
          sequelize.where(
            sequelize.fn("MONTH", sequelize.col("last_solde_update")),
            { [Op.ne]: currentMonth + 1 }
          ),
          sequelize.where(
            sequelize.fn("YEAR", sequelize.col("last_solde_update")),
            { [Op.ne]: currentYear }
          ),
        ],
      },
    });

    if (employes.length === 0) {
      console.log("Tous les employés ont déjà été mis à jour ce mois-ci.");
      return;
    }

    for (let employe of employes) {
      employe.solde_employe += 2.5;
      employe.last_solde_update = new Date();
      await employe.save();
    }

    console.log(`Solde mis à jour pour ${employes.length} employés.`);
  } catch (error) {
    console.error("Erreur lors de la mise à jour des soldes : ", error);
  }
}

console.log("Exécution du script de mise à jour des soldes des employés...");
updatesolde();
