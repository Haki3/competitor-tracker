const puppeteer = require('puppeteer');
const time = require('sleep-promise');
const { sendToDatabase } = require('../../../utils/db');

async function rebacasMain() {
    try {
        const kits = await rebacasScrapper('https://www.rebacas.com/124-kits-solares?resultsPerPage=99999', 'kit');
        const panels = await rebacasScrapper('https://www.rebacas.com/18-placas-solares?resultsPerPage=99999', 'panel');
        const inverters = await rebacasScrapper('https://www.rebacas.com/19-inversores?resultsPerPage=99999', 'inverter');
        const batteries = await rebacasScrapper('https://www.rebacas.com/49-baterias-solares?resultsPerPage=99999', 'battery');

        console.log('TOTAL PRODUCTS BY TYPE FROM REBACAS :','panels:', panels.length, 'inverters:', inverters.length, 'batteries:', batteries.length, 'kits:', kits.length);

        const products = panels.concat(kits,inverters, batteries);

        // await sendToDatabase(products);
    } catch (error) {
        console.error('Error in rebacasMain', error);
    }

}

async function rebacasScrapper(url, product_type) {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url);

    // Time sleep of 5 seconds to wait for the page to load
    await time(10000);
    // Try to scroll down for a few times to load all the products
    for (let i = 0; i < 10; i++) {
        await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
        });
        await time(4000);
    }

    let i = 1;
    let products = [];
    while (true) {
        const product_name_xpath = `/html/body/main/section/div[2]/div[1]/section/section/div[3]/div[2]/div[1]/div[${i}]/article/div[2]/div[1]/h2/a`;
        const product_price_xpath = `/html/body/main/section/div[2]/div[1]/section/section/div[3]/div[2]/div[1]/div[${i}]/article/div[2]/div[1]/div[4]/a/span`;

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
        product.product_store = 'rebacas';
        product.product_type = product_type;
        if (typeof product.product_price === 'string') {
            product.product_price = parseFloat(product.product_price.replace('€', '').replace('.', '').replace(',', '.'));
        }

        return product;
    });
    // console log inverter
    if (product_type === 'inverter') {
        console.log('Inverter:', products);
    }
    await browser.close();
    return products;

}

module.exports = rebacasMain;
