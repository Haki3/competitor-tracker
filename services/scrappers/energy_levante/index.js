const puppeteer = require('puppeteer');
const time = require('sleep-promise');
const { sendToDatabase } = require('../../../utils/db');

async function energyLevanteMain() {
    try {
        const panels = await energyLevanteScrapper('https://www.energylevante.com/es/placas-solares?resultsPerPage=99999', 'panel');
        const inverters = await energyLevanteScrapper('https://www.energylevante.com/es/inversores-solares?resultsPerPage=99999', 'inverter');
        const batteries = await energyLevanteScrapper('https://www.energylevante.com/es/baterias-placas-solares?resultsPerPage=99999', 'battery');
        const structures = await energyLevanteScrapper('https://www.energylevante.com/es/estructuras-placas-solares?resultsPerPage=99999', 'structure');
        const car_chargers = await energyLevanteScrapper('https://www.energylevante.com/es/cargadores-coches-electricos-enchufables?resultsPerPage=99999', 'car_charger');

        const products = panels.concat(inverters, batteries,structures, car_chargers);

        console.log('TOTAL PRODUCTS BY TYPE FROM ENERGY LEVANTE :','panels:', panels.length, 'inverters:', inverters.length, 'batteries:', batteries.length, 'structures:', structures.length, 'car_chargers:', car_chargers.length);

        await sendToDatabase(products);
    } catch (error) {
        console.error('Error in energyLevanteMain', error);
    }

}

async function energyLevanteScrapper(url, product_type) {
    const browser = await puppeteer.launch({ignoreHTTPSErrors: true});
    const page = await browser.newPage();
    try {
        await page.goto(url);
    } catch (error) {
        console.error('Error waiting for the page to load', error);
    }
    if(product_type === 'inverter') {
        // Esperar 10 segundos para que cargue el contenido
        await time(10000);
    }

    let i = 1;
    let products = [];
    while (true) {
        const product_name_xpath = `/html/body/main/section/div/div/div[1]/section/section/div[3]/div[2]/div[1]/div[${i}]/article/div[2]/div[1]/div[1]/h2/a`;
        const product_price_xpath = `/html/body/main/section/div/div/div[1]/section/section/div[3]/div[2]/div[1]/div[${i}]/article/div[2]/div[1]/div[2]/div/span`;

        const product_name = await page.evaluate((xpath) => {
            const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            return element ? element.textContent : null;
        }, product_name_xpath);

        let product_price = await page.evaluate((xpath) => {
            const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            return element ? element.textContent : null;
        }, product_price_xpath);

        let product_url = await page.evaluate((xpath) => {
            const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            return element ? element.href : null;
        }, product_name_xpath);

        if (!product_name) {
            break;
        }

        products.push({ product_name, product_price, product_url });

        i++;
    }

    // Añadir a cada elemento de products el campo "product_store" con el valor "rebacas" y eliminar el signo de euro del precio y eliminar el punto de los miles y las comas de los decimales y convertirlo a float
    
    products = products.map(product => {
        product.product_store = 'energy_levante';
        product.product_type = product_type;
        if (typeof product.product_price === 'string') {
            product.product_price = parseFloat(product.product_price.replace('€', '').replace('.', '').replace(',', '.'));
        }

        return product;
    });

    await browser.close();
    return products;

}

module.exports = energyLevanteMain;
