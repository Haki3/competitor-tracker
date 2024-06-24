const puppeteer = require('puppeteer');
const time = require('sleep-promise');
const { sendToDatabase } = require('../../../utils/db');

async function solarFacilMain() {
    try {
        const panels = await solarFacilScrapper('https://solar-facil.es/paneles-solares/?orderby=price-desc', 'panel');
        const inverters = await solarFacilScrapper('https://solar-facil.es/inversores/?orderby=price-desc', 'inverter');
        const charge_regulators = await solarFacilScrapper('https://solar-facil.es/reguladores-12v/?orderby=price-desc', 'charge_regulator');
        const batteries = await solarFacilScrapper('https://solar-facil.es/baterias/?orderby=price-desc', 'battery');
        const structures = await solarFacilScrapper('https://solar-facil.es/estructuras/?orderby=price-desc', 'structure');
        const car_chargers = await solarFacilScrapper('https://solar-facil.es/e-movilidad/?orderby=price-desc', 'car_charger');

        const products = panels.concat(inverters, batteries,structures, car_chargers, charge_regulators);

        console.log('TOTAL PRODUCTS BY TYPE FROM SUMINISTRO DEL SOL :','panels:', panels.length, 'inverters:', inverters.length, 'batteries:', batteries.length, 'structures:', structures.length, 'car_chargers:', car_chargers.length, 'charge_regulators:', charge_regulators.length);

        await sendToDatabase(products);
    } catch (error) {
        console.error('Error in suministrodelsolar', error);
    }

}

async function solarFacilScrapper(baseUrl, product_type) {
    console.log('Scraping SolarFacil ...');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    let currentPage = 1;
    let products = [];

    while (true) {
        const url = currentPage === 1 ? baseUrl : baseUrl.replace('?orderby=price-desc', `page/${currentPage}/?orderby=price-desc`);        console.log('Navigating to page:', url);
        await page.goto(url);
        await time(3000);

        let i = 1;

        while (true) {
            const product_name_xpath =      `/html/body/div[2]/div[1]/div/div[2]/main/div/ul/li[${i}]/div[2]/a/h2`;
            const product_price_xpath =     `/html/body/div[2]/div[1]/div/div[2]/main/div/ul/li[${i}]/div[2]/span/ins/span/bdi`;
            const product_price_xpath_2 =   `/html/body/div[2]/div[1]/div/div[2]/main/div/ul/li[${i}]/div[2]/span/span/bdi`;
            const product_url_xpath =       `/html/body/div[2]/div[1]/div/div[2]/main/div/ul/li[${i}]/div[2]/a`;

            const product_name = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent.trim() : null;
            }, product_name_xpath);

            if (product_name === null) {
                break;
            }

            let product_price = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent.trim() : null;
            }, product_price_xpath);

            if (product_price === null) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent.trim() : null;
                }, product_price_xpath_2);
            }

            if (product_price === null ) {
                product_price = 'Agotado';
            }

            let product_url = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.href : null;
            }, product_url_xpath);

            console.log('Product:', product_name, product_price, product_url);

            products.push({ product_name, product_price, product_url });

            i++;
        }

        const isPageNotFound = await page.evaluate(() => document.body.textContent.includes('Parece que esta página no existe.'));
        if (isPageNotFound) {
            console.log('No more products in this category. Moving to the next one.');
            break; // Salta a la siguiente categoría
        }

        currentPage++;
    }

    // Añadir a cada elemento de products el campo "product_store" con el valor "rebacas" y eliminar el signo de euro del precio y eliminar el punto de los miles y las comas de los decimales y convertirlo a float
    
    products = products.map(product => {
        if (typeof product.product_name === 'string') {
            product.product_name = product.product_name.replace(/\s*\(\d+(,\d+)*\)/g, '');
        }
        product.product_store = 'solarfacil';
        product.product_type = product_type;
        if (typeof product.product_price === 'string') {
            product.product_price = parseFloat(product.product_price.replace('€', '').replace('.', '').replace(',', '.'));
        }
        return product;
    });

    console.log('Products scraped from solarfacil:', products.length, 'of type', product_type)
    console.log('Last product scraped:', products[products.length - 1]);

    await browser.close();
    return products;
}


module.exports = solarFacilMain;
