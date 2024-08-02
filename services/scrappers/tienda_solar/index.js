const puppeteer = require('puppeteer');
const { sendToDatabase } = require('../../../utils/db');

async function tiendaSolarMain() {
    const panels = await tiendaSolarScrapper('https://tienda-solar.es/es/1923-paneles-solares', 'panel');
    const inverters = await tiendaSolarScrapper('https://tienda-solar.es/es/1924-inversores-solares', 'inverter');
    const batteries = await tiendaSolarScrapper('https://tienda-solar.es/es/1895-baterias-placas-solares', 'battery');
    const car_chargers = await tiendaSolarScrapper('https://tienda-solar.es/es/1970-cargadores-electricos', 'car_charger');
    const kits = await tiendaSolarScrapper('https://tienda-solar.es/es/1922-kit-solar', 'kit');
    const charge_regulators = await tiendaSolarScrapper('https://tienda-solar.es/es/1925-regulador-solar', 'charge_regulator');
    const structures = await tiendaSolarScrapper('https://tienda-solar.es/es/1936-estructura-paneles-solares', 'structure');
    const pumping_systems = await tiendaSolarScrapper('https://tienda-solar.es/es/1974-bombeo-solar', 'pumping_system');

    const products = panels.concat(inverters, batteries, car_chargers, kits, charge_regulators, structures, pumping_systems);
    console.log('TOTAL PRODUCTS RETRIEVED BY TYPE:', 'panels:', panels.length, 'inverters:', inverters.length, 'batteries:', batteries.length, 'car_chargers:', car_chargers.length, 'kits:', kits.length, 'charge_regulators:', charge_regulators.length, 'structures:', structures.length, 'pumping_systems:', pumping_systems.length);

    if (products && products.length > 0) {
        await sendToDatabase(products);
        console.log('TiendaSolar prices updated. Sending to database...');
    } else {
        console.log('No products found');
    }
}

async function tiendaSolarScrapper(url, product_type) {
    console.log('Navigating to URL:', url);

    const products = [];
    let pageNum = 1;

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
        protocolTimeout: 60000 // 60 segundos
    });

    while (true) {
        let success = false;
        for (let attempt = 1; attempt <= 5; attempt++) {
            let page;
            try {
                page = await browser.newPage();

                await page.setRequestInterception(true);
                page.on('request', (req) => {
                    if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                        req.abort();
                    } else {
                        req.continue();
                    }
                });

                console.log(`Navigating to ${url}?page=${pageNum}, attempt ${attempt}`);
                await page.goto(`${url}?page=${pageNum}`, {
                    timeout: 50000 // 50 segundos
                });
                success = true;
                break;
            } catch (error) {
                console.error(`Error navigating to ${url}?page=${pageNum}, attempt ${attempt}: ${error.message}`);
                if (attempt < 5) {
                    console.log(`Waiting 10 seconds before retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 10000));
                } else {
                    console.error(`Failed to load ${url}?page=${pageNum} after 5 attempts. Skipping...`);
                }
            } finally {
                if (page) await page.close();
            }
        }

        if (!success) {
            break;
        }

        let hasProducts = false;
        console.log('Connection successful. Scraping page', pageNum);

        const page = await browser.newPage();
        await page.goto(`${url}?page=${pageNum}`, { waitUntil: 'domcontentloaded' });
        for (let i = 1; ; i++) {
            const productNameXPath = `/html/body/main/section/div[2]/div/div[1]/section/section/div[3]/div[2]/div/div[${i}]/article/div[2]/h2/a`;
            const productPriceXPath = `/html/body/main/section/div[2]/div/div[1]/section/section/div[3]/div[2]/div/div[${i}]/article/div[2]/div[3]/a/span`;

            const product_name = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent : null;
            }, productNameXPath);
            if (!product_name) {
                break;
            }

            const product_price = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent : null;
            }, productPriceXPath);

            const product_url = await page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.href : null;
            }, productNameXPath);

            console.log('PRODUCT:', product_name, 'PRICE:', product_price, 'URL:', product_url);

            products.push({ product_name, product_price, product_type, product_store: 'tienda_solar', product_url });
            hasProducts = true;
        }

        await page.close();

        if (!hasProducts) {
            break;
        }

        pageNum++;
    }

    const uniqueProducts = products.filter(
        (product, index, self) =>
            index === self.findIndex((p) => p.product_name === product.product_name && p.product_price === product.product_price)
    );

    for (const product of uniqueProducts) {
        product.product_store = 'tienda_solar';
        product.product_type = product_type;
        if (typeof product.product_price === 'string') {
            product.product_price = parseFloat(product.product_price.replace('€', '').replace('.', '').replace(',', '.'));
        }

        if (!product.product_type) {
            product.product_type = product_type;
        }

        product.product_name = product.product_name.replace(/(Inversor|Panel|Bateria|Batería|Litio|Regulador|Módulo|híbrido|Cargador|Kit|Estructura|Bomba|Solar|Fotovoltaico|Placa|Fotovoltaica|eléctrico|ye|Alto Voltaje)/gi, '').trim();
        product.product_name = product.product_name.trim();
    }

    await browser.close();
    return uniqueProducts;
}

module.exports = tiendaSolarMain;
