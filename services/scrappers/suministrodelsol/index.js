const puppeteer = require('puppeteer');
const time = require('sleep-promise');
const { sendToDatabase } = require('../../../utils/db');

async function suministroSolarMain() {
    try {
        const panels = await suministroSolarScrapper('https://suministrosdelsol.com/es/12-paneles-solares', 'panel');
        const inverters = await suministroSolarScrapper('https://suministrosdelsol.com/es/134-inversores-por-marca', 'inverter');
        const batteries = await suministroSolarScrapper('https://suministrosdelsol.com/es/84-baterias-de-litio', 'battery');
        const structures = await suministroSolarScrapper('https://suministrosdelsol.com/es/15-soportes-y-estructuras-paneles-solares', 'structure');
        const car_chargers = await suministroSolarScrapper('https://suministrosdelsol.com/es/101-cargadores-coches-electricos', 'car_charger');

        const products = panels.concat(inverters, batteries,structures, car_chargers);

        console.log('TOTAL PRODUCTS BY TYPE FROM SUMINISTRO DEL SOL :','panels:', panels.length, 'inverters:', inverters.length, 'batteries:', batteries.length, 'structures:', structures.length, 'car_chargers:', car_chargers.length);

        await sendToDatabase(products);
    } catch (error) {
        console.error('Error in suministrodelsolar', error);
    }

}

async function suministroSolarScrapper(baseUrl, product_type) {
    console.log('Scraping Suministro del Sol ...');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    let currentPage = 1;
    let products = [];

    while (true) {
        const url = `${baseUrl}?page=${currentPage}/`;
        console.log('Navigating to page:', url);
        await page.goto(url);
        await time(3000);

        let i = 1;

        while (true) {
            const product_name_xpath = `//li[${i}]/div/div[2]/h3/a`;
            const product_price_xpath =     `//li[${i}]/div/div[2]/div[1]/span`;
            const product_price_xpath_2 =   `//li[${i}]/div/div[2]/div[1]/span[2]`;
            const product_price_xpath_3 =   `//li[${i}]/div/div[2]/div[1]/span[3]`;
            const product_url_xpath = `//li[${i}]/div/div[2]/h3/a`;

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
            }, product_price_xpath_2);

            if (product_price === null) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent.trim() : null;
                }, product_price_xpath_3);
            }

            if (product_price === null) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent.trim() : null;
                }, product_price_xpath);
            }

            if (product_price === null ) {
                product_price = 'Agotado';
            }

            let product_url = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.href : null;
            }, product_url_xpath);

            products.push({ product_name, product_price, product_url });

            i++;
        }

        const isPageNotFound = await page.evaluate(() => document.body.textContent.includes('Lamentamos las molestias.'));
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
        product.product_store = 'suministrodelsol';
        product.product_type = product_type;
        if (typeof product.product_price === 'string') {
            product.product_price = parseFloat(product.product_price.replace('€', '').replace('.', '').replace(',', '.'));
        }
        return product;
    });

    console.log('Products scraped from suministrodelSol:', products.length, 'of type', product_type)
    console.log('Last product scraped:', products[products.length - 1]);

    await browser.close();
    return products;
}


module.exports = suministroSolarMain;
