const puppeteer = require('puppeteer');
const { sendToDatabase } = require('../../../utils/db');

async function wccSolarMain() {
    const panels = await wccScrapper('https://www.wccsolar.net/paneles-solares', 'panel');
    const inverters = await wccScrapper('https://www.wccsolar.net/inversores-solares/', 'inverter');
    const batteries = await wccScrapper('https://www.wccsolar.net/baterias-solares/', 'battery');
    const kits = await wccScrapper('https://www.wccsolar.net/kits-solares/', 'kit');
    const charge_regulators = await wccScrapper('https://www.wccsolar.net/reguladores-solares/', 'charge_regulator');
    const structures = await wccScrapper('https://www.wccsolar.net/estructuras-solares/', 'structure');
    const pumping_systems = await wccScrapper('https://www.wccsolar.net/bombas-solares/', 'pumping_system');

    const products = panels.concat(inverters, batteries, kits, charge_regulators, structures, pumping_systems);
    console.log('TOTAL PRODUCTS RETRIEVED BY TYPE:', 'panels:', panels.length, 'inverters:', inverters.length, 'batteries:', batteries.length, 'kits:', kits.length , 'charge_regulators:', charge_regulators.length, 'structures:', structures.length, 'pumping_systems:', pumping_systems.length);
    console.log('wccSolar prices updated. Sending to database...');

    await sendToDatabase(products);
}

async function wccScrapper(url, product_type) {
    console.log('URL:', url);
    let products = [];
    const maxAttempts = 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        let hasProducts = true;
        let pageNum = 1;

        try {
            while (hasProducts) {
                const page = await browser.newPage();
                await page.goto(`${url}/page/${pageNum}`, { waitUntil: 'networkidle2', timeout: 60000 }); // 60 segundos

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

                    if (product_price === null) {
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
                        }, productUrlXPath2);
                    }

                    // Cuando no haya más productos, salir del bucle
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

            // Añadir a cada producto el campo "product_store" y limpiar el precio
            products.forEach(product => {
                product.product_store = 'wcc';
                product.product_type = product_type;
                if (typeof product.product_price === 'string' && product.product_price !== 'Agotado') {
                    product.product_price = parseFloat(product.product_price.replace('€', '').replace('.', '').replace(',', '.'));
                }

                // Asignar "wcc" a productos sin tipo
                if (!product.product_type) {
                    product.product_type = 'wcc';
                }
            });

            await browser.close();
            return products;

        } catch (error) {
            console.error(`Error navigating to ${url}, attempt ${attempt}: ${error.message}`);
            if (attempt === maxAttempts) {
                console.error(`Failed to load ${url} after ${maxAttempts} attempts. Skipping...`);
                await browser.close();
                return [];
            }
        } finally {
            await browser.close();
        }
    }

    return products;
}

module.exports = wccSolarMain;
