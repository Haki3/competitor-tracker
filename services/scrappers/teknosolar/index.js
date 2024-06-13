const puppeteer = require('puppeteer');
const time = require('sleep-promise');
const { sendToDatabase } = require('../../../utils/db');

async function teknosolarMain() {
    console.log('Scraping teknosolar...');
    try {
        const kits = await teknosolarScrapper('https://www.teknosolar.com/kit-solar-fotovoltaico/', 'kit');
        const panels = await teknosolarScrapper('https://www.teknosolar.com/placas-solares/', 'panel');
        const inverters = await teknosolarScrapper('https://www.teknosolar.com/inversores/', 'inverter');
        const batteries = await teknosolarScrapper('https://www.teknosolar.com/baterias/', 'battery');
        const structures = await teknosolarScrapper('https://www.teknosolar.com/componentes-fotovoltaicos/estructuras/', 'structure');
        const car_chargers = await teknosolarScrapper('https://www.teknosolar.com/otros-productos/movilidad-electrica/', 'car_charger');
        const charge_regulators = await teknosolarScrapper('https://www.teknosolar.com/reguladores-de-carga/', 'charge_regulator');

        const products = panels.concat(inverters, batteries,structures, car_chargers, charge_regulators, kits);

        console.log('TOTAL PRODUCTS BY TYPE FROM TEKNO SOLAR :','panels:', panels.length, 'inverters:', inverters.length, 'batteries:', batteries.length, 'structures:', structures.length, 'car_chargers:', car_chargers.length, 'charge_regulators:', charge_regulators.length);

        await sendToDatabase(products);
    } catch (error) {
        console.error('Error in teknosolarMain', error);
    }

}

async function teknosolarScrapper(baseUrl, product_type) {
    console.log('URL:', baseUrl, 'Product type:', product_type)
    console.log('Scraping teknosolar...');
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
        await time(5000);
        // Press ESC to remove the cookie warning
        await page.keyboard.press('Escape');
        await time(2000);

        let i = 1;

        while (true) {
            const product_name_xpath   = `/html/body/div[3]/div[1]/div[2]/div/div/div[4]/div[${i}]/div/div[3]/h3/a`;
            const product_price_xpath = `/html/body/div[3]/div[1]/div[2]/div/div/div[4]/div[${i}]/div/div[3]/div[2]/span/span/bdi`;
            const product_price_xpath_2 = `/html/body/div[3]/div[1]/div[2]/div/div/div[4]/div[${i}]/div/div[3]/div[3]/span/ins/span/bdi`;
            const product_price_xpath_offer = `/html/body/div[3]/div[1]/div[2]/div/div/div[4]/div[${i}]/div/div[3]/div[2]/span/ins/span/bdi`;
            const product_url_xpath = `/html/body/div[3]/div[1]/div[2]/div/div/div[4]/div[${i}]/div/div[3]/h3/a`;

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

            if (!product_price) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent : null;
                }, product_price_xpath_2);
            }

            let product_url = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.href : null;
            }, product_url_xpath);

            products.push({ product_name, product_price, product_url });

            i++;
        }

        const isPageNotFound = await page.evaluate(() => document.body.textContent.includes('ERROR 404'));
        if (isPageNotFound) {
            console.log('ERROR 404 found, moving to the next category...');
            break; // Salta a la siguiente categoría
        }

        currentPage++;
    }

    // Añadir a cada elemento de products el campo "product_store" con el valor "rebacas" y eliminar el signo de euro del precio y eliminar el punto de los miles y las comas de los decimales y convertirlo a float
    
    products = products.map(product => {
        product.product_store = 'teknosolar';
        product.product_type = product_type;
        if (typeof product.product_price === 'string') {
            product.product_price = parseFloat(product.product_price.replace('€', '').replace('.', '').replace(',', '.'));
        }

        return product;
    });

    console.log('Last product scraped:', products[products.length - 1]);

    await browser.close();
    return products;
}


module.exports = teknosolarMain;
