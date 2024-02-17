// Importar los scrappers
const tiendaSolarMain = require('../../services/scrappers/tienda_solar');
const atersaMain = require('../../services/scrappers/atersa');
const autosolarMain = require('../../services/scrappers/autosolar');
const supermercadosolarMain = require('../../services/scrappers/supermercadosolar');

async function updateCompetitor(parametro) {
    const scrappers = {
        'tienda_solar': tiendaSolarMain,
        // 'atersa': atersaMain,
        // 'autosolar': autosolarMain,
        // 'supermercadosolar': supermercadosolarMain,
    };

    if (scrappers[parametro]) {
        console.log(`Getting ${parametro} prices...`);
        await Promise.all([scrappers[parametro]()]);
    } else {
        console.log('Deactivated scrapper no parameter passed');
    }
}

module.exports = { updateCompetitor };
