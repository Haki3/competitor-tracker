const puppeteer = require('puppeteer');
const { sendToDatabase } = require('../../../utils/db');


async function supermercadosolarMain() {
    try {
        const panels = await supermercadosolarScrapper('https://supermercadosolar.es/18-placas-solares', 'panel');
        const inverters = await supermercadosolarScrapper('https://supermercadosolar.es/29-inversores', 'inverter');
        const batteries = await supermercadosolarScrapper('https://supermercadosolar.es/38-baterias-solares', 'battery');

        // Si hay algun panel inverter o batería sin type aplicarlo a todos los productos con su product_type correspondiente
        if (panels.some(panel => !panel.product_type) || inverters.some(inverter => !inverter.product_type) || batteries.some(battery => !battery.product_type)) {
            panels.forEach(panel => panel.product_type = 'panel');
            inverters.forEach(inverter => inverter.product_type = 'inverter');
            batteries.forEach(battery => battery.product_type = 'battery');
        }

        const products = panels.concat(inverters, batteries);

        await sendToDatabase(products);
    } catch (error) {
        console.error('Error in autosolarMain', error);
    }
}


async function supermercadosolarScrapper(url, product_type) {

    const browser = await puppeteer.launch({ignoreHTTPSErrors: true});
    const page = await browser.newPage();
    await page.goto(url);

    let i = 1;
    let products = [];
    while (true) {
        const product_name_xpath = `/html/body/main/section/div[2]/div/div[1]/section/section/div[4]/div[2]/div[1]/div[${i}]/article/div[2]/h2/a`;
        const product_price_xpath = `/html/body/main/section/div[2]/div/div[1]/section/section/div[4]/div[2]/div[1]/div[${i}]/article/div[2]/div[3]/a/span`;

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

    // Añadir a cada elemento de products el campo "product_store" con el valor "supermercadosolar" y eliminar el signo de euro del precio y eliminar el punto de los miles y las comas de los decimales y convertirlo a float
    products = products.map(product => {
        product.product_store = 'supermercadosolar';
        product.product_type = product_type;
        if (typeof product.product_price === 'string') {
            product.product_price = parseFloat(product.product_price.replace('€', '').replace('.', '').replace(',', '.'));
        }

        //  Si queda cualquier producto sin product_type, asignarle el valor "supermercadosolar"
        if (!product.product_type) {
            product.product_type = 'supermercadosolar';
        }
        return product;
    });

    await browser.close();
    return products;
}

module.exports = supermercadosolarMain;