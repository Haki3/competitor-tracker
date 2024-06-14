const puppeteer = require('puppeteer');
const { sendToDatabase } = require('../../../utils/db');

async function wccSolarMain() {
    const panels = await wccScrapper('https://www.wccsolar.net/paneles-solares', 'panel');
    const inverters = await wccScrapper('https://www.wccsolar.net/todos-inversores/', 'inverter');
    const batteries = await wccScrapper('https://www.wccsolar.net/todos-baterias/', 'battery');
    const kits = await wccScrapper('https://www.wccsolar.net/todos-kits-fotovoltaicos', 'kit');
    const charge_regulators = await wccScrapper('https://www.wccsolar.net/reguladores', 'charge_regulator');
    const structures = await wccScrapper('https://www.wccsolar.net/todos-estructuras/', 'structure');
    const pumping_systems = await wccScrapper('https://www.wccsolar.net/todos-bombas-solares/', 'pumping_system');

    const products = panels.concat(inverters, batteries, kits, charge_regulators, structures, pumping_systems);
    console.log('TOTAL PRODUCTS RETRIEVED BY TYPE:', 'panels:', panels.length, 'inverters:', inverters.length, 'batteries:', batteries.length, 'kits:', kits.length , 'charge_regulators:', charge_regulators.length, 'structures:', structures.length, 'pumping_systems:', pumping_systems.length);
    console.log('wccSolar prices updated. Sending to database...');

    await sendToDatabase(products);
}

async function wccScrapper(url, product_type) {
    console.log('URL:', url);
    const products = [];

    let pageNum = 1;
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    let hasProducts = true;

    while (hasProducts) {
        const page = await browser.newPage();
        await page.goto(`${url}/page/${pageNum}`);

        hasProducts = false;

        for (let i = 1; ; i++) {
            const productNameXPath  = `/html/body/div[2]/div[2]/div/div/div[1]/ul[1]/li[${i}]/div/div[2]/a/h2`;
            const productNameXPath2 = `/html/body/div[2]/div[2]/div/div/div[1]/ul[2]/li[${i}]/div/div[2]/a/h2`;
            const productPriceXPath =  `/html/body/div[2]/div[2]/div/div/div[1]/ul[1]/li[${i}]/div/div[2]/span[1]/ins/span/bdi`;
            const productPriceXPath2 = `/html/body/div[2]/div[2]/div/div/div[1]/ul[1]/li[${i}]/div/div[2]/span[1]/span/bdi`;
            const productUlPriceXPath =`/html/body/div[2]/div[2]/div/div/div[1]/ul[2]/li[${i}]/div/div[2]/span[1]/span/bdi`;
            const productUlPriceXPath2 =`/html/body/div[2]/div[2]/div/div/div[1]/ul[2]/li[${i}]/div/div[2]/span[1]/ins/span/bdi`;
            const productUrlXPath   = `/html/body/div[2]/div[2]/div/div/div[1]/ul[1]/li[${i}]/div/div[2]/a`;
            const productUrlXPath2   = `/html/body/div[2]/div[2]/div/div/div[1]/ul[2]/li[${i}]/div/div[2]/a`;


            let product_name = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent.trim() : null;
            }, productNameXPath);

            if (product_name === null) {
                product_name = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent.trim() : null;
                }, productNameXPath2);
            }

            if (product_name === null) {
                break;
            }

            let product_price = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent.trim() : null;
            }, productPriceXPath);

            if (product_price === null) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent.trim() : null;
                }, productPriceXPath2);
            }

            if (product_price === null) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent.trim() : null;
                }, productUlPriceXPath);
            }

            if (product_price === null) {
                product_price = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.textContent.trim() : null;
                }, productUlPriceXPath2);
            }

            if (product_price === null ) {
                product_price = 'Agotado';
            }

            let product_url = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.getAttribute('href') : null;
            }, productUrlXPath);

            if (product_url === null) {
                product_url = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return element ? element.getAttribute('href') : null;
                }
                , productUrlXPath2);
            }

            // When there are no more products, exit the loop
            if (!product_name) {
                break;
            }

            products.push({
                product_name,
                product_price,
                product_url,
            });

            hasProducts = true;
        }
        pageNum++;
    }

    // Añadir a cada elemento de products el campo "product_store" con el valor "wcc" y eliminar el signo de euro del precio y eliminar el punto de los miles y las comas de los decimales y convertirlo a float
    products.forEach(product => {
        product.product_store = 'wcc';
        product.product_type = product_type;
        if (typeof product.product_price === 'string' && product.product_price !== 'Agotado') {
            product.product_price = parseFloat(product.product_price.replace('€', '').replace('.', '').replace(',', '.'));
        }

        //  Si queda cualquier producto sin product_type, asignarle el valor "wcc"
        if (!product.product_type) {
            product.product_type = 'wcc';
        }
    });

    await browser.close();
    return products;
}

module.exports = wccSolarMain;