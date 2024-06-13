const puppeteer = require('puppeteer');
const time = require('sleep-promise');
const { sendToDatabase } = require('../../../utils/db');

async function efectoSolarMain() {
    try {
        const panels = await efectoSolarScrapper('https://efectosolar.es/categoria-producto/paneles-solares/', 'panel');
        const inverters = await efectoSolarScrapper('https://efectosolar.es/categoria-producto/inversores/', 'inverter');
        const batteries = await efectoSolarScrapper('https://efectosolar.es/categoria-producto/baterias/', 'battery');
        const structures = await efectoSolarScrapper('https://efectosolar.es/categoria-producto/estructuras/', 'structure');
        const car_chargers = await efectoSolarScrapper('https://efectosolar.es/categoria-producto/e-mobility/', 'car_charger');

        const products = panels.concat(inverters, batteries,structures, car_chargers);

        console.log('TOTAL PRODUCTS BY TYPE FROM EFECTO SOLAR :','panels:', panels.length, 'inverters:', inverters.length, 'batteries:', batteries.length, 'structures:', structures.length, 'car_chargers:', car_chargers.length);

        await sendToDatabase(products);
    } catch (error) {
        console.error('Error in efectoSolarMain', error);
    }

}

async function efectoSolarScrapper(baseUrl, product_type) {
    console.log('Scraping efectoSolar...');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    let currentPage = 1;
    let products = [];

    while (true) {
        const url = `${baseUrl}page/${currentPage}/`;
        console.log('Navigating to page:', url);
        // if the text "Page Not Found" is found, we break the loop
        if (await page.evaluate(() => document.body.textContent.includes('Page Not Found'))) {
            break;
        }
        await page.goto(url);
        await time(3000);

        let i = 1;

        while (true) {
            const product_name_xpath = `/html/body/div[4]/div[4]/div/div/main/ul/li[${i}]/div/div[2]/h2`;
            const product_price_xpath_offer = `/html/body/div[4]/div[4]/div/div/main/ul/li[${i}]/div/div[2]/span/ins/span/bdi`;
            const product_price_xpath = `/html/body/div[4]/div[4]/div/div/main/ul/li[${i}]/div/div[2]/span/span[1]/bdi`;
            const product_url_xpath = `/html/body/div[4]/div[4]/div/div/main/ul/li[${i}]/div/div[2]/h2/a`;

            const product_name = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent : null;
            }, product_name_xpath);

            if (!product_name) {
                break;
            }

            let product_price = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent : null;
            }, product_price_xpath_offer);

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, product_price_xpath);
            }

            let product_url = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.href : null;
            }, product_url_xpath);

            products.push({ product_name, product_price, product_url });

            i++;
        }

        // Si no hay productos en la página actual, salimos del bucle
        if (products.length === 0) {
            break;
        }

        currentPage++;
    }

    // Añadir a cada elemento de products el campo "product_store" con el valor "rebacas" y eliminar el signo de euro del precio y eliminar el punto de los miles y las comas de los decimales y convertirlo a float
    
    products = products.map(product => {
        if (typeof product.product_name === 'string') {
            product.product_name = product.product_name.replace(/\s*\(\d+(,\d+)*\)/g, '');
        }
        product.product_store = 'efecto_solar';
        product.product_type = product_type;
        if (typeof product.product_price === 'string') {
            product.product_price = parseFloat(product.product_price.replace('€', '').replace('.', '').replace(',', '.'));
        }
        return product;
    });

    console.log('Products scraped from efectoSolar:', products.length, 'of type', product_type)
    console.log('Last product scraped:', products[products.length - 1]);

    await browser.close();
    return products;
}


module.exports = efectoSolarMain;
