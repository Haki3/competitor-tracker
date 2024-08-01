const tiendaSolarMain = require('../../services/scrappers/tienda_solar');
const atersaMain = require('../../services/scrappers/atersa');
const autosolarMain = require('../../services/scrappers/autosolar');
const supermercadosolarMain = require('../../services/scrappers/supermercadosolar');
const wccSolarMain = require('../../services/scrappers/wcc');
const almacenFotovoltaicoMain = require('../../services/scrappers/almacen_fotovoltaico');
const rebacasMain = require('../../services/scrappers/rebacas');
const energyLevanteMain = require('../../services/scrappers/energy_levante');
const efectoSolarMain = require('../../services/scrappers/efecto_solar');
const teknoSolarMain = require('../../services/scrappers/teknosolar');
const suministroSolarMain = require('../../services/scrappers/suministrodelsol');
const solarFacilMain = require('../../services/scrappers/solarfacil');

async function updateCompetitor(parametro) {
    const scrappers = {
        'tienda_solar': tiendaSolarMain,
        'atersa': atersaMain,
        'autosolar': autosolarMain,
        'supermercadosolar': supermercadosolarMain,
        'wcc': wccSolarMain,
        'almacen_fotovoltaico': almacenFotovoltaicoMain,
        'rebacas': rebacasMain,
        'energy_levante': energyLevanteMain,
        'efecto_solar': efectoSolarMain,
        'teknosolar': teknoSolarMain,
        'suministrodelsol': suministroSolarMain,
        'solarfacil': solarFacilMain,
    };

    if (scrappers[parametro]) {
        console.log(`Getting ${parametro} prices...`);
        // Call the scrapper function if any error occurs , it will loop 5 times and pass to the next scrapper
        try {
            for (let attempt = 1; attempt <= 5; attempt++) {
                try {
                    await scrappers[parametro]();
                    break;
                }
                catch (error) {
                    console.error(`Error in ${parametro} scrapper`, error);
                    if (attempt === 5) {
                        console.error(`Failed to load ${parametro} after 5 attempts. Skipping...`);
                    }
                }
            }
        } catch (error) {
            console.error(`Error in ${parametro} scrapper`, error);
        }
    } else {
        console.log('Deactivated scrapper; no parameter passed');
    }
}

module.exports = { updateCompetitor };
