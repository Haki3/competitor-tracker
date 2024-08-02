const puppeteer = require('puppeteer');
const { sendToDatabase } = require('../../../utils/db');

async function supermercadosolarMain() {
    try {
        const panels = await supermercadosolarScrapper('https://supermercadosolar.es/18-placas-solares?resultsPerPage=99999', 'panel');
        const inverters = await supermercadosolarScrapper('https://supermercadosolar.es/29-inversores?resultsPerPage=99999', 'inverter');
        const batteries = await supermercadosolarScrapper('https://supermercadosolar.es/38-baterias-solares?resultsPerPage=99999', 'battery');
        const litiumBatteries = await supermercadosolarScrapper('https://supermercadosolar.es/107-baterias-litio?resultsPerPage=99999', 'battery');

        // Save batteries and litiumBatteries in the same array
        batteries.push(...litiumBatteries);

        // Si hay algún panel, inverter o batería sin type aplicarlo a todos los productos con su product_type correspondiente
        if (panels.some(panel => !panel.product_type) || inverters.some(inverter => !inverter.product_type) || batteries.some(battery => !battery.product_type)) {
            panels.forEach(panel => panel.product_type = 'panel');
            inverters.forEach(inverter => inverter.product_type = 'inverter');
            batteries.forEach(battery => battery.product_type = 'battery');
            litiumBatteries.forEach(battery => battery.product_type = 'battery');
        }

        const products = panels.concat(inverters, batteries);

        console.log('TOTAL PRODUCTS RETRIEVED BY TYPE:', 'panels:', panels.length, 'inverters:', inverters.length, 'batteries:', batteries.length);

        await sendToDatabase(products);
    } catch (error) {
        console.error('Error in supermercadoSolarMain', error);
    }
}

async function supermercadosolarScrapper(url, product_type) {
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

            // Eliminar palabras que no sean el modelo y códigos de producto en el nombre del producto y eliminar espacios al principio y al final , cualquier palabra que esté en el diccionario español : Inversor, Panel, Bateria, Regulador, Cargador, Kit, Estructura, Bomba, Solar, Fotovoltaico, Placa
            product_name.replace(/Inversor|Panel|Bateria|Regulador|Cargador|Kit|Estructura|Bomba|Solar|Fotovoltaico|Placa/g, '');

            // Eliminar espacios al principio y al final
            product_name.trim();

            products.push({ product_name, product_price, product_url });

            hasProducts = true;
        }

        await page.close();

        if (!hasProducts) {
            break;
        }

        pageNum++;
    }

    // Añadir a cada elemento de products el campo "product_store" con el valor "supermercadosolar" y eliminar el signo de euro del precio y eliminar el punto de los miles y las comas de los decimales y convertirlo a float
    const uniqueProducts = products.map(product => {
        product.product_store = 'supermercadosolar';
        product.product_type = product_type;
        if (typeof product.product_price === 'string') {
            product.product_price = parseFloat(product.product_price.replace('€', '').replace('.', '').replace(',', '.'));
        }

        return product;
    });

    await browser.close();
    return uniqueProducts;
}

module.exports = supermercadosolarMain;
